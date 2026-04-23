import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Mirror a note into another idea or project.
// Creates a new input row in the target with mirror_source_id pointing at
// the root of the source's mirror group (always a flat tree, root never nested).
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_type, target_id } = await req.json() as {
    target_type: 'idea' | 'project'
    target_id: string
  }

  if (!['idea', 'project'].includes(target_type) || !target_id) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  const { data: source, error: fetchErr } = await supabase
    .from('inputs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Use the root of the mirror group (keeps the tree flat — one hop max)
  const rootId: string = source.mirror_source_id ?? source.id

  // Don't mirror into the same container we're already in
  if (target_type === 'idea' && source.idea_id === target_id) {
    return NextResponse.json({ error: 'Already in this idea' }, { status: 400 })
  }
  if (target_type === 'project' && source.project_id === target_id) {
    return NextResponse.json({ error: 'Already in this project' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    user_id: user.id,
    content: source.content,
    role: source.role,
    is_note: source.is_note ?? true,
    image_transcript: source.image_transcript ?? null,
    mirror_source_id: rootId,
    idea_id: target_type === 'idea' ? target_id : null,
    project_id: target_type === 'project' ? target_id : null,
  }

  const { data, error } = await supabase
    .from('inputs')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ input: data }, { status: 201 })
}
