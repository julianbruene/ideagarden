import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Send a Dump node into a project as a note. The node leaves the Dump
// (deleted) — its content now lives as a project note. For a single
// project / chapter this becomes an outline note; for a book it lands
// in the Book Dump (same shape: an inputs row with project_id + is_note).
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id } = await req.json() as { project_id?: string }
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  // Fetch the node (auth-scoped)
  const { data: node, error: nodeErr } = await supabase
    .from('nodes')
    .select('id, content, content_type, image_url, image_transcript')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (nodeErr || !node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify the target project belongs to the user
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .eq('user_id', user.id)
    .single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Image nodes carry their url in content as [img]<url>; text nodes use content as-is.
  const content = node.content_type === 'image' && node.image_url
    ? `[img]${node.image_url}`
    : (node.content ?? '')

  const { data: input, error: insertErr } = await supabase
    .from('inputs')
    .insert({
      project_id,
      idea_id: null,
      user_id: user.id,
      content,
      role: 'user',
      is_note: true,
      image_transcript: node.image_transcript ?? null,
    })
    .select()
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Node has moved into the project — remove it from the Dump.
  await supabase.from('nodes').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ input }, { status: 201 })
}
