import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import DoneClient, { type DoneItem } from './DoneClient'

export const dynamic = 'force-dynamic'

export default async function KompostPage() {
  const supabase = await createClient()

  const [{ data: ideas }, { data: projects }] = await Promise.all([
    supabase
      .from('ideas')
      .select('id, title, synthesis, completed_at')
      .eq('status', 'done')
      .order('completed_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title, synthesis, outline, writing_content, completed_at')
      .eq('status', 'done')
      .order('completed_at', { ascending: false }),
  ])

  const ideaIds = (ideas ?? []).map((i) => i.id)
  const projectIds = (projects ?? []).map((p) => p.id)

  const [{ data: ideaInputs }, { data: projectInputs }] = await Promise.all([
    ideaIds.length > 0
      ? supabase.from('inputs').select('idea_id, content, image_transcript').in('idea_id', ideaIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('inputs').select('project_id, content, image_transcript').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build aggregated searchable text per container
  const ideaTextMap: Record<string, string[]> = {}
  for (const row of (ideaInputs ?? []) as Array<{ idea_id: string; content: string; image_transcript: string | null }>) {
    const parts = ideaTextMap[row.idea_id] ?? (ideaTextMap[row.idea_id] = [])
    if (row.content) parts.push(row.content.startsWith('[img]') ? (row.image_transcript ?? '') : row.content)
  }
  const projectTextMap: Record<string, string[]> = {}
  for (const row of (projectInputs ?? []) as Array<{ project_id: string; content: string; image_transcript: string | null }>) {
    const parts = projectTextMap[row.project_id] ?? (projectTextMap[row.project_id] = [])
    if (row.content) parts.push(row.content.startsWith('[img]') ? (row.image_transcript ?? '') : row.content)
  }

  const items: DoneItem[] = [
    ...(ideas ?? []).map((i) => ({
      id: i.id,
      kind: 'idea' as const,
      title: i.title,
      synthesis: i.synthesis,
      completed_at: i.completed_at,
      searchBlob: [
        i.title ?? '',
        i.synthesis ?? '',
        ...(ideaTextMap[i.id] ?? []),
      ].join(' ').toLowerCase(),
    })),
    ...(projects ?? []).map((p) => ({
      id: p.id,
      kind: 'project' as const,
      title: p.title,
      synthesis: p.synthesis,
      completed_at: p.completed_at,
      searchBlob: [
        p.title ?? '',
        p.synthesis ?? '',
        p.outline ?? '',
        p.writing_content ?? '',
        ...(projectTextMap[p.id] ?? []),
      ].join(' ').toLowerCase(),
    })),
  ].sort((a, b) => {
    const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0
    return tb - ta
  })

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-semibold text-garden-text">Kompost</h1>
          <p className="text-[11px] text-garden-muted/70 mt-0.5">
            Alles was den Kreislauf abgeschlossen hat.
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <DoneClient items={items} />
      </main>

      <NavBar />
    </div>
  )
}
