import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, simpleSparringPrompt } from '@/lib/anthropic'

interface Params { params: Promise<{ id: string }> }

// DELETE — wipe the chat history for this idea (notes untouched)
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Chat messages have is_note != true (false or null in legacy rows).
  const { error } = await supabase
    .from('inputs')
    .delete()
    .eq('idea_id', id)
    .eq('user_id', user.id)
    .not('is_note', 'is', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return new Response('message required', { status: 400 })

  // Fetch idea + history + user prompt overrides
  const [{ data: idea }, { data: history }, { data: userSettings }] = await Promise.all([
    supabase.from('ideas').select('title').eq('id', id).single(),
    supabase
      .from('inputs')
      .select('role, content, is_note, image_transcript')
      .eq('idea_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('user_settings')
      .select('sparring_prompt')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // Save user message
  await supabase.from('inputs').insert({
    idea_id: id,
    user_id: user.id,
    content: message,
    role: 'user',
  })

  // Build text-only history for Claude (images sent as transcript)
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

  // Stream response via SSE
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 400,
          system: simpleSparringPrompt(
            idea?.title ?? null,
            'idea',
            userSettings?.sparring_prompt ?? null,
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

        // Persist the assistant message
        await supabase.from('inputs').insert({
          idea_id: id,
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
