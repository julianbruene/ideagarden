import { createClient } from '@/lib/supabase/server'
import FictionClient from './FictionClient'

export const dynamic = 'force-dynamic'

export default async function FictionPage() {
  const supabase = await createClient()

  const { data: novels } = await supabase
    .from('projects')
    .select('*')
    .is('parent_project_id', null)
    .eq('genre', 'fiction')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const list = novels ?? []
  const ids = list.map((n) => n.id)

  // Chapter counts per novel (done vs total) for a subtle progress hint
  const chapterCount: Record<string, number> = {}
  const chapterDone: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: chapters } = await supabase
      .from('projects')
      .select('parent_project_id, status')
      .in('parent_project_id', ids)
    for (const row of chapters ?? []) {
      if (!row.parent_project_id) continue
      chapterCount[row.parent_project_id] = (chapterCount[row.parent_project_id] ?? 0) + 1
      if (row.status === 'done') {
        chapterDone[row.parent_project_id] = (chapterDone[row.parent_project_id] ?? 0) + 1
      }
    }
  }

  return <FictionClient initialNovels={list} chapterCount={chapterCount} chapterDone={chapterDone} />
}
