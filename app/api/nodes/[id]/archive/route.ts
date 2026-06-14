import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Archive a Dump node — park it as a completed idea so it lands in the
// Kompost (the archive). The idea is created already 'done', seeded with
// the node's content, and the node is marked promoted (kept + linked via
// source_node_ids), which removes it from the Dump.
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: node, error: nodeErr } = await supabase
    .from('nodes')
    .select('id, content, content_type, image_url, image_transcript')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (nodeErr || !node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Derive a short title from the text (first line, trimmed) — null for images.
  const firstLine = (node.content ?? '').split('\n')[0].trim()
  const title = firstLine ? firstLine.slice(0, 80) : null

  // Create the idea already completed.
  const nowIso = new Date().toISOString()
  const { data: idea, error: ideaErr } = await supabase
    .from('ideas')
    .insert({
      user_id: user.id,
      source_node_ids: [id],
      title,
      status: 'done',
      completed_at: nowIso,
    })
    .select()
    .single()
  if (ideaErr) return NextResponse.json({ error: ideaErr.message }, { status: 500 })

  // Seed the idea with the node content as its first note.
  const seedContent = node.content_type === 'image' && node.image_url
    ? `[img]${node.image_url}`
    : (node.content ?? '')
  if (seedContent) {
    await supabase.from('inputs').insert({
      idea_id: idea.id,
      project_id: null,
      user_id: user.id,
      content: seedContent,
      role: 'user',
      is_note: true,
      image_transcript: node.image_transcript ?? null,
    })
  }

  // Mark the node promoted — keeps it (linked via source_node_ids) and
  // removes it from the Dump's promoted=false view.
  await supabase.from('nodes').update({ promoted: true }).eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ idea }, { status: 201 })
}
