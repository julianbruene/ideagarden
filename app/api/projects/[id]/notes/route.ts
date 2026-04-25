import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Add a note OR section ('Abschnitt') to a project — no AI triggered
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, is_section = false } = await req.json() as {
    content: string
    is_section?: boolean
  }
  // Sections may have empty title at creation time — only require content for notes
  if (!is_section && !content?.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('inputs')
    .insert({
      project_id: id,
      idea_id: null,
      user_id: user.id,
      content: (content ?? '').trim(),
      role: 'user',
      is_note: true,
      is_section,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ input: data }, { status: 201 })
}
