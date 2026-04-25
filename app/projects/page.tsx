import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import ProjectCard from '@/components/ProjectCard'
import NewProjectButton from './NewProjectButton'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()

  // Top-level projects only — chapters are nested inside their parent book
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .is('parent_project_id', null)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const list = projects ?? []
  const singleIds = list.filter((p) => p.kind !== 'book').map((p) => p.id)
  const bookIds = list.filter((p) => p.kind === 'book').map((p) => p.id)

  // Input count for non-book projects
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

  // Chapter counts for books
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

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-md border-b border-garden-border/60 pt-safe">
        <div className="max-w-lg md:max-w-3xl mx-auto px-5 py-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl text-garden-text leading-none" style={{ fontWeight: 500 }}>Projects</h1>
            <p className="text-[11px] text-garden-muted-soft mt-1 tracking-wide">Größere Werke im Werden.</p>
          </div>
          <NewProjectButton />
        </div>
      </header>

      <main className="max-w-lg md:max-w-3xl mx-auto px-5 pt-5">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <div className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</div>
            <p className="font-serif text-base text-garden-muted italic">Noch keine Projekte.</p>
            <p className="text-xs text-garden-muted-soft mt-2">
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

      <NavBar />
    </div>
  )
}
