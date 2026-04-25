import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import ProjectCard from '@/components/ProjectCard'
import NewProjectButton from './NewProjectButton'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .is('parent_project_id', null)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const list = projects ?? []
  const singleIds = list.filter((p) => p.kind !== 'book').map((p) => p.id)
  const bookIds = list.filter((p) => p.kind === 'book').map((p) => p.id)

  const inputCountMap: Record<string, number> = {}
  if (singleIds.length > 0) {
    const { data: counts } = await supabase
      .from('inputs')
      .select('project_id')
      .in('project_id', singleIds)
    for (const row of counts ?? []) {
      if (row.project_id) inputCountMap[row.project_id] = (inputCountMap[row.project_id] ?? 0) + 1
    }
  }

  const chapterCountMap: Record<string, number> = {}
  const chapterDoneMap: Record<string, number> = {}
  if (bookIds.length > 0) {
    const { data: chapters } = await supabase
      .from('projects')
      .select('parent_project_id, status')
      .in('parent_project_id', bookIds)
    for (const row of chapters ?? []) {
      if (!row.parent_project_id) continue
      chapterCountMap[row.parent_project_id] = (chapterCountMap[row.parent_project_id] ?? 0) + 1
      if (row.status === 'done') {
        chapterDoneMap[row.parent_project_id] = (chapterDoneMap[row.parent_project_id] ?? 0) + 1
      }
    }
  }

  const totalEntries =
    Object.values(inputCountMap).reduce((s, n) => s + n, 0) +
    Object.values(chapterCountMap).reduce((s, n) => s + n, 0)
  const bookCount = bookIds.length

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 pt-12 md:pt-10 pb-6 md:pb-8 pt-safe border-b border-garden-hairline">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono micro-caps text-garden-muted-soft">03 · Projects</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          <NewProjectButton />
        </div>
        <h1
          className="font-display display-tight balance text-garden-ink"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
        >
          Größere Werke <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>im Werden.</em>
        </h1>
        {list.length > 0 && (
          <div className="flex items-center gap-4 md:gap-6 mt-4 text-[13px] text-garden-muted flex-wrap">
            <span><span className="tabnums text-garden-ink">{list.length}</span> aktiv</span>
            <span className="font-mono micro-caps text-garden-muted-soft">·</span>
            <span><span className="tabnums text-garden-ink">{bookCount}</span> {bookCount === 1 ? 'Buch' : 'Bücher'}</span>
            <span className="font-mono micro-caps text-garden-muted-soft">·</span>
            <span><span className="tabnums text-garden-ink">{totalEntries}</span> Einträge gesamt</span>
          </div>
        )}
      </header>

      <main className="px-6 md:px-12 pt-6 md:pt-8">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch keine Projekte.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Wenn eine Idee groß genug ist, mach ein Projekt draus.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                inputCount={inputCountMap[project.id] ?? 0}
                chapterCount={chapterCountMap[project.id] ?? 0}
                chaptersDone={chapterDoneMap[project.id] ?? 0}
              />
            ))}
          </div>
        )}
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
