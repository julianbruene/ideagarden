import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: idea } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('idea_id', id)
    .order('created_at', { ascending: true })

  // Build markdown
  const lines: string[] = []
  const title = idea.title || 'Untitled Idea'
  const completedDate = idea.completed_at
    ? new Date(idea.completed_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })

  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`*Completed: ${completedDate}*`)
  lines.push('')

  lines.push('## Notes')
  lines.push('')

  for (const input of inputs ?? []) {
    const time = new Date(input.created_at).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    if (input.role === 'user') {
      lines.push(`**${time}**`)
      lines.push('')
      lines.push(input.content)
      lines.push('')
    } else {
      lines.push(`> *AI — ${time}*`)
      lines.push('>')
      input.content.split('\n').forEach((l: string) => lines.push(`> ${l}`))
      lines.push('')
    }
  }

  const markdown = lines.join('\n')
  return NextResponse.json({ markdown })
}
