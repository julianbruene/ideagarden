import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, CHAT_SYSTEM } from '@/lib/anthropic'

interface Params { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return new Response('message required', { status: 400 })

  // Fetch idea + full input history
  const [{ data: idea }, { data: history }] = await Promise.all([
    supabase.from('ideas').select('title').eq('id', id).single(),
    supabase
      .from('inputs')
      .select('role, content, is_note, image_transcript')
      .eq('idea_id', id)
      .order('created_at', { ascending: true }),
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
          system: CHAT_SYSTEM(idea?.title ?? null, null),
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
