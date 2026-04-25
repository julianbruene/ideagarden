import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ideas: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    source_node_ids = [],
    initial_content,  // optional text to seed the idea (from Idea Sex)
    title,
  } = body

  // Create the idea
  const { data: idea, error } = await supabase
    .from('ideas')
    .insert({ user_id: user.id, source_node_ids, title: title ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gather seed content from source nodes
  const sourceContents: string[] = []

  if (source_node_ids.length > 0) {
    const { data: sourceNodes } = await supabase
      .from('nodes')
      .select('id, content, content_type, image_url')
      .in('id', source_node_ids)

    for (const n of sourceNodes ?? []) {
      if (n.content_type === 'image' && n.image_url) {
        sourceContents.push(`[img]${n.image_url}`)
      } else if (n.content) {
        sourceContents.push(n.content)
      }
    }

    // Mark nodes as promoted
    await supabase
      .from('nodes')
      .update({ promoted: true })
      .in('id', source_node_ids)
      .eq('user_id', user.id)
  }

  if (initial_content) {
    sourceContents.push(initial_content)
  }

  // Insert seed content as the first note
  if (sourceContents.length > 0) {
    const seedText = sourceContents.join('\n\n---\n\n')

    const { error: inputError } = await supabase
      .from('inputs')
      .insert({
        idea_id: idea.id,
        user_id: user.id,
        content: seedText,
        role: 'user',
        is_note: true,
      })

    if (inputError) {
      console.error('Seed input insert failed:', inputError.message)
    }
  }

  return NextResponse.json({ idea }, { status: 201 })
}
