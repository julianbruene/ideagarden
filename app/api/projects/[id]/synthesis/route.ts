import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, SYNTHESIS_SYSTEM } from '@/lib/anthropic'

export const maxDuration = 30

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inputs } = await supabase
    .from('inputs')
    .select('content, role, image_transcript')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  if (!inputs || inputs.length === 0) {
    return NextResponse.json({ synthesis: null })
  }

  const combined = inputs
    .map((i) => {
      const text = i.content.startsWith('[img]')
        ? i.image_transcript?.trim()
          ? `Screenshot: ${i.image_transcript}`
          : '[Screenshot]'
        : i.content
      return i.role === 'user' ? text : `[AI: ${text}]`
    })
    .join('\n\n')

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYNTHESIS_SYSTEM,
      messages: [{ role: 'user', content: combined }],
    })

    const synthesis = msg.content[0].type === 'text' ? msg.content[0].text : null

    if (synthesis) {
      await supabase
        .from('projects')
        .update({ synthesis })
        .eq('id', id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ synthesis })
  } catch (err) {
    console.error('Synthesis error:', err)
    return NextResponse.json({ synthesis: null })
  }
}
