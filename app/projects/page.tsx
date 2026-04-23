import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import ProjectCard from '@/components/ProjectCard'
import NewProjectButton from './NewProjectButton'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const ids = (projects ?? []).map((p) => p.id)
  let countMap: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('inputs')
      .select('project_id')
      .in('project_id', ids)

    countMap = (counts ?? []).reduce((acc, row) => {
      if (row.project_id) acc[row.project_id] = (acc[row.project_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-md border-b border-garden-border/60 pt-safe">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl text-garden-text leading-none" style={{ fontWeight: 500 }}>Projects</h1>
            <p className="text-[11px] text-garden-muted-soft mt-1 tracking-wide">Größere Werke im Werden.</p>
          </div>
          <NewProjectButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-5">
        {(projects ?? []).length === 0 ? (
          <div className="text-center py-20">
            <div className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</div>
            <p className="font-serif text-base text-garden-muted italic">Noch keine Projekte.</p>
            <p className="text-xs text-garden-muted-soft mt-2">
              Wenn eine Idee groß genug ist, mach ein Projekt draus.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(projects ?? []).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                inputCount={countMap[project.id] ?? 0}
              />
            ))}
          </div>
        )}
      </main>

      <NavBar />
    </div>
  )
}
