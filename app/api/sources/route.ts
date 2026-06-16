import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sources: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type = 'book', title = null, author = null, status = 'want' } = await req.json() as Partial<{
    type: string; title: string | null; author: string | null; status: string
  }>

  const { data, error } = await supabase
    .from('sources')
    .insert({ user_id: user.id, type, title, author, status })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ source: data }, { status: 201 })
}
