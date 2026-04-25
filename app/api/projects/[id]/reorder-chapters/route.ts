import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// POST — batch update chapter_order for child projects of this book
// Body: { ordered_ids: string[] } — chapter project ids in desired order
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ordered_ids } = await req.json() as { ordered_ids: string[] }
  if (!Array.isArray(ordered_ids)) {
    return NextResponse.json({ error: 'ordered_ids array required' }, { status: 400 })
  }

  const errors: string[] = []
  for (let i = 0; i < ordered_ids.length; i++) {
    const chapterId = ordered_ids[i]
    const { error } = await supabase
      .from('projects')
      .update({ chapter_order: i })
      .eq('id', chapterId)
      .eq('parent_project_id', id)
      .eq('user_id', user.id)
    if (error) errors.push(`${chapterId}: ${error.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
