import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const lines: string[] = []
  const title = project.title || 'Unbenanntes Projekt'
  const completedDate = project.completed_at
    ? new Date(project.completed_at).toLocaleDateString('de-DE', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : new Date().toLocaleDateString('de-DE', {
        year: 'numeric', month: 'long', day: 'numeric',
      })

  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`*Abgeschlossen: ${completedDate}*`)
  lines.push('')

  if (project.synthesis) {
    lines.push('## Synthese')
    lines.push('')
    lines.push(project.synthesis)
    lines.push('')
  }

  if (project.outline) {
    lines.push('## Gliederung')
    lines.push('')
    lines.push(project.outline)
    lines.push('')
  }

  if (project.writing_content) {
    lines.push('## Text')
    lines.push('')
    lines.push(project.writing_content)
    lines.push('')
  }

  lines.push('## Notes & Chat')
  lines.push('')

  for (const input of inputs ?? []) {
    const time = new Date(input.created_at).toLocaleString('de-DE', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    if (input.role === 'user') {
      lines.push(`**${time}**`)
      lines.push('')
      lines.push(input.content)
      lines.push('')
    } else {
      lines.push(`> *KI — ${time}*`)
      lines.push('>')
      input.content.split('\n').forEach((l: string) => lines.push(`> ${l}`))
      lines.push('')
    }
  }

  const markdown = lines.join('\n')
  return NextResponse.json({ markdown })
}
