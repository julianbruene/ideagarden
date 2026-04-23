import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import DoneClient, { type DoneItem } from './DoneClient'

export const dynamic = 'force-dynamic'

export default async function DonePage() {
  const supabase = await createClient()

  const [{ data: ideas }, { data: projects }] = await Promise.all([
    supabase
      .from('ideas')
      .select('id, title, synthesis, completed_at')
      .eq('status', 'done')
      .order('completed_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title, synthesis, completed_at')
      .eq('status', 'done')
      .order('completed_at', { ascending: false }),
  ])

  const items: DoneItem[] = [
    ...(ideas ?? []).map((i) => ({ ...i, kind: 'idea' as const })),
    ...(projects ?? []).map((p) => ({ ...p, kind: 'project' as const })),
  ].sort((a, b) => {
    const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0
    return tb - ta
  })

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-semibold text-garden-text">Done</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">&#x2705;</div>
            <p className="text-sm text-garden-muted">Noch nichts abgeschlossen.</p>
            <p className="text-xs text-garden-muted/60 mt-1">
              Fertige Ideen und Projekte landen hier im Archiv.
            </p>
          </div>
        ) : (
          <DoneClient items={items} />
        )}
      </main>

      <NavBar />
    </div>
  )
}
