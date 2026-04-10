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
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-garden-text">Garden</h1>
          <Link
            href="/dump"
            className="text-xs px-3 py-1.5 rounded-xl bg-garden-accent text-white font-medium hover:bg-garden-accent-dark transition-colors"
          >
            + New idea
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {(ideas ?? []).length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">&#x1F33F;</div>
            <p className="text-sm text-garden-muted">Your garden is empty.</p>
            <p className="text-xs text-garden-muted/60 mt-1 mb-6">
              Promote a node from the Dump to start growing an idea.
            </p>
            <Link
              href="/dump"
              className="text-sm text-garden-accent hover:underline"
            >
              Go to Dump
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
