import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Add a raw reading note to a source.
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content = '', location = null } = await req.json() as { content?: string; location?: string | null }

  const { data, error } = await supabase
    .from('source_notes')
    .insert({
      source_id: id,
      user_id: user.id,
      content: (content ?? '').trim(),
      location: location?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}
