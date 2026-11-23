import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Change read status and/or the rewrite draft.
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    status?: string; draft?: string | null; draft_platform?: string; draft_status?: string
  }
  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!['new', 'read', 'archived'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    update.status = body.status
  }
  if (body.draft !== undefined) {
    update.draft = body.draft
    update.draft_updated_at = new Date().toISOString()
  }
  if (body.draft_platform !== undefined) {
    if (!['threads', 'substack', 'both'].includes(body.draft_platform)) {
      return NextResponse.json({ error: 'invalid platform' }, { status: 400 })
    }
    update.draft_platform = body.draft_platform
  }
  if (body.draft_status !== undefined) {
    // 'sent' is set only by the push-to-EDEN step, not from the UI.
    if (!['none', 'writing', 'ready'].includes(body.draft_status)) {
      return NextResponse.json({ error: 'invalid draft status' }, { status: 400 })
    }
    update.draft_status = body.draft_status
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feed_posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('feed_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
