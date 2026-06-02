import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Linked concepts with reflections, newest reflection first
  const { data: pairs } = await supabase
    .from('concept_goals')
    .select('concept_id, reflection, updated_at')
    .eq('goal_id', id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const conceptIds = (pairs ?? []).map((p) => p.concept_id)
  let concepts: { id: string; title: string | null; summary: string | null }[] = []
  if (conceptIds.length > 0) {
    const { data } = await supabase
      .from('concepts')
      .select('id, title, summary')
      .in('id', conceptIds)
    concepts = data ?? []
  }

  // Stitch — preserve the pair ordering
  const conceptMap = new Map(concepts.map((c) => [c.id, c]))
  const linked = (pairs ?? []).map((p) => ({
    concept: conceptMap.get(p.concept_id),
    reflection: p.reflection as string | null,
    updated_at: p.updated_at,
  })).filter((row) => row.concept)

  return NextResponse.json({ goal, linked })
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['title', 'description']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
