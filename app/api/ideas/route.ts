import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, SYNTHESIS_SYSTEM } from '@/lib/anthropic'

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
      .select('content, content_type')
      .in('id', source_node_ids)

    for (const n of sourceNodes ?? []) {
      if (n.content) sourceContents.push(n.content)
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

  // If we have seed content, create the first user input and generate synthesis
  if (sourceContents.length > 0) {
    const seedText = sourceContents.join('\n\n---\n\n')

    const { data: insertedInput, error: inputError } = await supabase
      .from('inputs')
      .insert({
        idea_id: idea.id,
        user_id: user.id,
        content: seedText,
        role: 'user',
        is_note: true,
      })
      .select()
      .single()

    if (inputError) {
      console.error('Seed input insert failed:', inputError.message)
      // Surface the error in response so client can see it during debugging
      idea._seedInputError = inputError.message
    } else {
      idea._seedInput = insertedInput
    }

    // Generate initial synthesis
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 200,
        system: SYNTHESIS_SYSTEM,
        messages: [{ role: 'user', content: seedText }],
      })
      const synthesis = msg.content[0].type === 'text' ? msg.content[0].text : null
      if (synthesis) {
        await supabase.from('ideas').update({ synthesis }).eq('id', idea.id)
        idea.synthesis = synthesis
      }
    } catch (e) {
      console.error('Synthesis failed:', e)
    }
  }

  return NextResponse.json({ idea }, { status: 201 })
}
