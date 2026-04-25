import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

// GET — export an entire book (parent project + all chapters) as one markdown file
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: book } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (book.kind !== 'book') return NextResponse.json({ error: 'Not a book' }, { status: 400 })

  const { data: chapters } = await supabase
    .from('projects')
    .select('*')
    .eq('parent_project_id', id)
    .eq('user_id', user.id)
    .order('chapter_order', { ascending: true })

  const lines: string[] = []
  const completedDate = book.completed_at
    ? new Date(book.completed_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })

  lines.push(`# ${book.title || 'Unbenanntes Buch'}`)
  lines.push('')
  lines.push(`*Abgeschlossen: ${completedDate}*`)
  lines.push('')

  if (book.kernidee) {
    lines.push(`> ${book.kernidee}`)
    lines.push('')
  }

  // Each chapter gets its writing_content under its title
  for (const chapter of chapters ?? []) {
    lines.push('---')
    lines.push('')
    lines.push(`## ${chapter.title || 'Unbenanntes Kapitel'}`)
    lines.push('')
    if (chapter.kernidee) {
      lines.push(`*${chapter.kernidee}*`)
      lines.push('')
    }
    if (chapter.writing_content) {
      lines.push(chapter.writing_content)
      lines.push('')
    }
  }

  return NextResponse.json({ markdown: lines.join('\n') })
}
