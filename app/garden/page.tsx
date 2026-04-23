import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import IdeaCard from '@/components/IdeaCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GardenPage() {
  const supabase = await createClient()

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .eq('status', 'growing')
    .order('created_at', { ascending: false })

  // Fetch input counts for each idea
  const ids = (ideas ?? []).map((i) => i.id)
  let countMap: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('inputs')
      .select('idea_id')
      .in('idea_id', ids)

    countMap = (counts ?? []).reduce((acc, row) => {
      acc[row.idea_id] = (acc[row.idea_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-md border-b border-garden-border/60 pt-safe">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl text-garden-text leading-none" style={{ fontWeight: 500 }}>Garden</h1>
            <p className="text-[11px] text-garden-muted-soft mt-1 tracking-wide">Was gerade wächst.</p>
          </div>
          <Link
            href="/dump"
            className="text-xs px-3.5 py-2 rounded-lg bg-garden-accent text-white font-medium hover:bg-garden-accent-dark transition-colors shadow-paper"
          >
            + Neue Idee
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-5">
        {(ideas ?? []).length === 0 ? (
          <div className="text-center py-20">
            <div className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</div>
            <p className="font-serif text-base text-garden-muted italic">Dein Garden ist leer.</p>
            <p className="text-xs text-garden-muted-soft mt-2 mb-6">
              Schick eine Note aus dem Dump hierher, um anzufangen.
            </p>
            <Link
              href="/dump"
              className="text-sm text-garden-accent hover:underline"
            >
              Zum Dump
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(ideas ?? []).map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                inputCount={countMap[idea.id] ?? 0}
              />
            ))}
          </div>
        )}
      </main>

      <NavBar />
    </div>
  )
}
