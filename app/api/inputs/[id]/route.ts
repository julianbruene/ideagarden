import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// Delete an input
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('inputs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Send note back to Dump as a new node
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the input content
  const { data: input, error: fetchErr } = await supabase
    .from('inputs')
    .select('content')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !input) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Create new node in Dump
  const { data: node, error: nodeErr } = await supabase
    .from('nodes')
    .insert({ user_id: user.id, content: input.content, content_type: 'text' })
    .select()
    .single()

  if (nodeErr) return NextResponse.json({ error: nodeErr.message }, { status: 500 })

  // Delete the input
  await supabase.from('inputs').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ node }, { status: 201 })
}
