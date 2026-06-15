import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('promoted', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ nodes: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { content, content_type = 'text', image_url = null, genre = 'nonfiction' } = body

  if (!content && !image_url) {
    return NextResponse.json({ error: 'content or image_url required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('nodes')
    .insert({ user_id: user.id, content, content_type, image_url, genre })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ node: data }, { status: 201 })
}
