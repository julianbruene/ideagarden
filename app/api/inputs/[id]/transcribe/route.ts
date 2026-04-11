import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/anthropic'

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: input, error: fetchErr } = await supabase
    .from('inputs')
    .select('id, content')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !input) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!input.content.startsWith('[img]')) {
    return NextResponse.json({ error: 'Not an image note' }, { status: 400 })
  }

  const imageUrl = input.content.slice(5)

  // Fetch image and convert to base64 so Claude doesn't need external URL access
  let base64: string
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`)
    const buffer = await imgRes.arrayBuffer()
    base64 = Buffer.from(buffer).toString('base64')
    const ct = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    mediaType = validTypes.includes(ct)
      ? (ct as typeof mediaType)
      : 'image/jpeg'
  } catch (e) {
    console.error('Image fetch failed:', e)
    return NextResponse.json({ error: 'Could not fetch image' }, { status: 502 })
  }

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Extrahiere den gesamten sichtbaren Text aus diesem Bild. Gib ausschließlich den extrahierten Text zurück – keine Erklärungen, keine Kommentare. Falls kein Text erkennbar ist, antworte mit einem leeren String.',
            },
          ],
        },
      ],
    })

    const transcript =
      msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''

    const { data: updated, error: updateErr } = await supabase
      .from('inputs')
      .update({ image_transcript: transcript || null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json({ input: updated })
  } catch (e) {
    console.error('Transcription failed:', e)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
