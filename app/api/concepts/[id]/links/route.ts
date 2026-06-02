import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Add a link between this concept and another.
// Links are undirected — we normalize so the smaller UUID is always `from_id`,
// preventing duplicate "A↔B" pairs stored once as A→B and once as B→A.
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { other_id } = await req.json() as { other_id?: string }
  if (!other_id || other_id === id) {
    return NextResponse.json({ error: 'other_id required and must differ' }, { status: 400 })
  }

  const [from_id, to_id] = id < other_id ? [id, other_id] : [other_id, id]

  const { error } = await supabase
    .from('concept_links')
    .upsert({ from_id, to_id, user_id: user.id }, { onConflict: 'from_id,to_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

// Remove a link.
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const other_id = searchParams.get('other_id')
  if (!other_id) return NextResponse.json({ error: 'other_id required' }, { status: 400 })

  const [from_id, to_id] = id < other_id ? [id, other_id] : [other_id, id]

  const { error } = await supabase
    .from('concept_links')
    .delete()
    .eq('from_id', from_id)
    .eq('to_id', to_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
