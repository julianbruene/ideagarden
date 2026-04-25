import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, chatSystemPrompt } from '@/lib/anthropic'
import type { ChatRole } from '@/lib/types'

export const maxDuration = 30

interface Params { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return new Response('message required', { status: 400 })

  // Fetch project + full input history
  const [{ data: project }, { data: history }] = await Promise.all([
    supabase.from('projects').select('title, chat_role').eq('id', id).single(),
    supabase
      .from('inputs')
      .select('role, content, is_note, image_transcript')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
  ])

  // Save user message
  await supabase.from('inputs').insert({
    project_id: id,
    idea_id: null,
    user_id: user.id,
    content: message,
    role: 'user',
  })

  function inputToText(h: { role: string; content: string; is_note?: boolean; image_transcript?: string | null }) {
    if (h.content.startsWith('[img]')) {
      return h.image_transcript?.trim()
        ? `Screenshot: ${h.image_transcript}`
        : '[Screenshot ohne Text]'
    }
    return h.content
  }

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...(history ?? []).map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: inputToText(h),
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
          max_tokens: 400,
          system: chatSystemPrompt(
            (project?.chat_role as ChatRole) ?? 'sparring',
            project?.title ?? null,
            'project',
          ),
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
