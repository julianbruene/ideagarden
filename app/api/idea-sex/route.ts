import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, IDEA_SEX_SYSTEM } from '@/lib/anthropic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodeA, nodeB } = await req.json()

  if (!nodeA || !nodeB) {
    return NextResponse.json({ error: 'nodeA and nodeB required' }, { status: 400 })
  }

  function describeNode(n: { content: string | null; content_type: string }): string {
    if (n.content_type === 'image') return '[An image with no text]'
    return n.content ?? '[empty]'
  }

  const prompt = `Node A:\n${describeNode(nodeA)}\n\nNode B:\n${describeNode(nodeB)}`

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: IDEA_SEX_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = msg.content[0].type === 'text' ? msg.content[0].text : null
    return NextResponse.json({ result })
  } catch (err) {
    console.error('Idea Sex error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
