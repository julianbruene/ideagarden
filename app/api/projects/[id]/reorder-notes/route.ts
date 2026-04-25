import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// POST — batch update outline_order for the project's notes
// Body: { ordered_ids: string[] } — input ids in desired order
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ordered_ids } = await req.json() as { ordered_ids: string[] }
  if (!Array.isArray(ordered_ids)) {
    return NextResponse.json({ error: 'ordered_ids array required' }, { status: 400 })
  }

  // Update each input's outline_order. Sequential awaits — small lists, simple.
  const errors: string[] = []
  for (let i = 0; i < ordered_ids.length; i++) {
    const inputId = ordered_ids[i]
    const { error } = await supabase
      .from('inputs')
      .update({ outline_order: i })
      .eq('id', inputId)
      .eq('project_id', id)
      .eq('user_id', user.id)
    if (error) errors.push(`${inputId}: ${error.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
