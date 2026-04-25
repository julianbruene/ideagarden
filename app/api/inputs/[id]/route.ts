import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// PATCH — update starred, content, and/or image_transcript.
// Content & image_transcript changes propagate to all mirrors (the mirror group).
// Starred is local — does not propagate.
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { starred, content, image_transcript, used, outline_order } = body as {
    starred?: boolean
    content?: string
    image_transcript?: string | null
    used?: boolean
    outline_order?: number | null
  }

  // Fetch the target input (for mirror group detection + auth)
  const { data: current, error: fetchErr } = await supabase
    .from('inputs')
    .select('id, mirror_source_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const shouldPropagate = content !== undefined || image_transcript !== undefined

  // Propagate content/transcript to the whole mirror group
  if (shouldPropagate) {
    const rootId = current.mirror_source_id ?? current.id
    const groupUpdates: Record<string, unknown> = {}
    if (content !== undefined) groupUpdates.content = content
    if (image_transcript !== undefined) groupUpdates.image_transcript = image_transcript

    // Update root and all mirrors pointing at the root in one go
    const { error: propErr } = await supabase
      .from('inputs')
      .update(groupUpdates)
      .eq('user_id', user.id)
      .or(`id.eq.${rootId},mirror_source_id.eq.${rootId}`)

    if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })
  }

  // Apply local-only fields (don't propagate to mirrors)
  const localUpdates: Record<string, unknown> = {}
  if (typeof starred === 'boolean') localUpdates.starred = starred
  if (typeof used === 'boolean') localUpdates.used = used
  if (outline_order !== undefined) localUpdates.outline_order = outline_order

  if (Object.keys(localUpdates).length > 0) {
    const { error: localErr } = await supabase
      .from('inputs')
      .update(localUpdates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (localErr) return NextResponse.json({ error: localErr.message }, { status: 500 })
  }

  // Return the updated input
  const { data: updated } = await supabase
    .from('inputs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ input: updated })
}

// Delete an input (does not delete mirrors — FK uses SET NULL, so mirrors
// become orphans but keep their content in their container)
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('inputs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST — send note back to Dump as a new node
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: input, error: fetchErr } = await supabase
    .from('inputs')
    .select('content')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !input) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: node, error: nodeErr } = await supabase
    .from('nodes')
    .insert({ user_id: user.id, content: input.content, content_type: 'text' })
    .select()
    .single()

  if (nodeErr) return NextResponse.json({ error: nodeErr.message }, { status: 500 })

  await supabase.from('inputs').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ node }, { status: 201 })
}
