import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
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

  const list = ideas ?? []
  const ids = list.map((i) => i.id)
  let countMap: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('inputs')
      .select('idea_id')
      .in('idea_id', ids)

    countMap = (counts ?? []).reduce((acc, row) => {
      if (row.idea_id) acc[row.idea_id] = (acc[row.idea_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 pt-12 md:pt-10 pb-6 md:pb-8 pt-safe border-b border-garden-hairline">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono micro-caps text-garden-muted-soft">02 · Garden</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          <Link
            href="/dump"
            className="font-mono micro-caps text-garden-accent flex items-center gap-1.5"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neue Idee
          </Link>
        </div>
        <h1
          className="font-display display-tight balance text-garden-ink"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
        >
          Was bei dir gerade <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>wächst.</em>
        </h1>
        <p className="mt-4 text-[13px] text-garden-muted">
          <span className="tabnums text-garden-ink">{list.length}</span> {list.length === 1 ? 'Idee' : 'Ideen'} · ungeordnet
        </p>
      </header>

      <main className="px-6 md:px-12 pt-6 md:pt-8">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Dein Garden ist leer.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2 mb-6">
              Schick eine Note aus dem Dump hierher.
            </p>
            <Link href="/dump" className="font-mono micro-caps text-garden-accent">
              → Zum Dump
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={i}
                inputCount={countMap[idea.id] ?? 0}
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
