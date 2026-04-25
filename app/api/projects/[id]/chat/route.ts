import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, chatSystemPrompt, type OutlineEntry } from '@/lib/anthropic'
import type { ChatRole } from '@/lib/types'

export const maxDuration = 30

interface Params { params: Promise<{ id: string }> }

const VALID_ROLES: ChatRole[] = ['sparring', 'researcher', 'editor']

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json() as { message?: string; role?: string }
  const message = body.message
  if (!message?.trim()) return new Response('message required', { status: 400 })

  // Fetch project — used for title, kernidee, writing_content, default role
  const { data: project } = await supabase
    .from('projects')
    .select('title, kernidee, writing_content, chat_role')
    .eq('id', id)
    .single()

  // Resolve role: client > project > default sparring
  const requestedRole = body.role && (VALID_ROLES as string[]).includes(body.role)
    ? (body.role as ChatRole)
    : null
  const role: ChatRole = requestedRole ?? (project?.chat_role as ChatRole) ?? 'sparring'

  // Fetch all notes (is_note=true) — shared across all roles
  const { data: notes } = await supabase
    .from('inputs')
    .select('content, is_section, image_transcript, outline_order')
    .eq('project_id', id)
    .eq('is_note', true)

  // Fetch chat history filtered to current role
  const { data: history } = await supabase
    .from('inputs')
    .select('role, content')
    .eq('project_id', id)
    .eq('chat_role', role)
    .order('created_at', { ascending: true })

  // Save user message tagged with role
  await supabase.from('inputs').insert({
    project_id: id,
    idea_id: null,
    user_id: user.id,
    content: message,
    role: 'user',
    chat_role: role,
    is_note: false,
  })

  const outline: OutlineEntry[] = (notes ?? []).map((n) => ({
    is_section: !!n.is_section,
    content: n.content,
    image_transcript: n.image_transcript,
    outline_order: n.outline_order,
  }))

  const systemPrompt = chatSystemPrompt(
    role,
    {
      title: project?.title ?? null,
      kernidee: project?.kernidee ?? null,
      outline,
      writing_content: role === 'editor' ? (project?.writing_content ?? null) : null,
    },
    'project',
  )

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...(history ?? []).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 600,
          system: systemPrompt,
          messages,
        })

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text
            fullText += text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        await supabase.from('inputs').insert({
          project_id: id,
          idea_id: null,
          user_id: user.id,
          content: fullText,
          role: 'assistant',
          chat_role: role,
          is_note: false,
        })
      } catch (err) {
        console.error('Chat stream error:', err)
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
