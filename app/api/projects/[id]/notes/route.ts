import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Add a note OR section ('Abschnitt') to a project — no AI triggered
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, is_section = false, is_open_point = false } = await req.json() as {
    content?: string
    is_section?: boolean
    is_open_point?: boolean
  }
  // Sections, notes, and open points may be created empty for inline-edit
  // flows. The client opens the new row in edit mode and the user types.

  // Only include is_open_point when actually true. Sending `false`
  // would still hit the column — which fails if migration 012 hasn't
  // run yet. Plain notes work either way; open points require 012.
  const insertData: Record<string, unknown> = {
    project_id: id,
    idea_id: null,
    user_id: user.id,
    content: (content ?? '').trim(),
    role: 'user',
    is_note: true,
    is_section,
  }
  if (is_open_point) insertData.is_open_point = true

  const { data, error } = await supabase
    .from('inputs')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ input: data }, { status: 201 })
}
