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
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-garden-text">Projects</h1>
          <NewProjectButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {(projects ?? []).length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">&#x1F4D6;</div>
            <p className="text-sm text-garden-muted">Noch keine Projekte.</p>
            <p className="text-xs text-garden-muted/60 mt-1">
              Mach aus einer Idee ein Projekt, wenn sie groß genug ist.
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
