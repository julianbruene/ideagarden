import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string; noteId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { noteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('content' in body) updates.content = (body.content ?? '').trim()
  if ('location' in body) updates.location = body.location?.trim() || null

  const { data, error } = await supabase
    .from('source_notes')
    .update(updates)
    .eq('id', noteId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { noteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('source_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
