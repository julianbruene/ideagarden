import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: concept, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !concept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Linked concepts (undirected): everything pointing at me OR that I point at.
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase.from('concept_links').select('to_id').eq('from_id', id).eq('user_id', user.id),
    supabase.from('concept_links').select('from_id').eq('to_id', id).eq('user_id', user.id),
  ])

  const linkedIds = new Set<string>([
    ...(outgoing ?? []).map((r) => r.to_id),
    ...(incoming ?? []).map((r) => r.from_id),
  ])

  let linked: unknown[] = []
  if (linkedIds.size > 0) {
    const { data } = await supabase
      .from('concepts')
      .select('id, title, summary')
      .in('id', Array.from(linkedIds))
    linked = data ?? []
  }

  return NextResponse.json({ concept, linked })
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['title', 'summary', 'own_example', 'body', 'source']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('concepts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ concept: data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('concepts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
