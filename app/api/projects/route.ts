import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    source_idea_ids = [],
    title,
  } = body

  // Create the project
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      source_idea_ids,
      title: title ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If created from ideas, seed with the source ideas' notes
  if (source_idea_ids.length > 0) {
    const { data: ideas } = await supabase
      .from('ideas')
      .select('id, title')
      .in('id', source_idea_ids)

    const { data: sourceNotes } = await supabase
      .from('inputs')
      .select('content, image_transcript')
      .in('idea_id', source_idea_ids)
      .eq('is_note', true)

    const seedParts: string[] = []

    for (const idea of ideas ?? []) {
      if (idea.title) seedParts.push(`## ${idea.title}`)
    }

    for (const n of sourceNotes ?? []) {
      if (n.content?.startsWith('[img]')) {
        if (n.image_transcript?.trim()) seedParts.push(`Screenshot: ${n.image_transcript}`)
      } else if (n.content) {
        seedParts.push(n.content)
      }
    }

    if (seedParts.length > 0) {
      const seedText = seedParts.join('\n\n---\n\n')
      await supabase.from('inputs').insert({
        project_id: project.id,
        idea_id: null,
        user_id: user.id,
        content: seedText,
        role: 'user',
        is_note: true,
      })
    }
  }

  return NextResponse.json({ project }, { status: 201 })
}
