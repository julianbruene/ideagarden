import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Link a goal to this concept, with an optional reflection.
// Idempotent — re-posting the same pair upserts the reflection.
export async function POST(req: Request, { params }: Params) {
  const { id: concept_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { goal_id, reflection } = await req.json() as { goal_id?: string; reflection?: string | null }
  if (!goal_id) return NextResponse.json({ error: 'goal_id required' }, { status: 400 })

  const trimmed = reflection?.trim() || null

  const { error } = await supabase
    .from('concept_goals')
    .upsert(
      {
        concept_id,
        goal_id,
        user_id: user.id,
        reflection: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'concept_id,goal_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

// Update only the reflection on an existing pair.
export async function PATCH(req: Request, { params }: Params) {
  const { id: concept_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { goal_id, reflection } = await req.json() as { goal_id?: string; reflection?: string | null }
  if (!goal_id) return NextResponse.json({ error: 'goal_id required' }, { status: 400 })

  const trimmed = reflection?.trim() || null

  const { error } = await supabase
    .from('concept_goals')
    .update({ reflection: trimmed, updated_at: new Date().toISOString() })
    .eq('concept_id', concept_id)
    .eq('goal_id', goal_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const { id: concept_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const goal_id = searchParams.get('goal_id')
  if (!goal_id) return NextResponse.json({ error: 'goal_id required' }, { status: 400 })

  const { error } = await supabase
    .from('concept_goals')
    .delete()
    .eq('concept_id', concept_id)
    .eq('goal_id', goal_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
