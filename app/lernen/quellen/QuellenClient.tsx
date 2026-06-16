'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Source, SourceStatus, SourceType } from '@/lib/types'

interface Props {
  initialSources: Source[]
  countMap: Record<string, number>
}

export const TYPE_LABEL: Record<SourceType, string> = {
  book: 'Buch', article: 'Artikel', podcast: 'Podcast',
  course: 'Kurs', conversation: 'Gespräch', other: 'Sonstiges',
}
export const STATUS_LABEL: Record<SourceStatus, string> = {
  want: 'Will ich lesen', reading: 'Lese gerade', done: 'Gelesen',
}

function StatusDot({ status }: { status: SourceStatus }) {
  if (status === 'done') return <span className="w-2 h-2 rounded-full bg-garden-accent flex-shrink-0" title="Gelesen" />
  if (status === 'reading') return (
    <span className="w-2 h-2 rounded-full border border-garden-accent flex-shrink-0 relative" title="Lese gerade">
      <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-garden-accent" />
    </span>
  )
  return <span className="w-2 h-2 rounded-full border border-garden-muted-soft flex-shrink-0" title="Will ich lesen" />
}

export default function QuellenClient({ initialSources, countMap }: Props) {
  const [sources] = useState<Source[]>(initialSources)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sources
    return sources.filter((s) =>
      (s.title ?? '').toLowerCase().includes(q) || (s.author ?? '').toLowerCase().includes(q)
    )
  }, [sources, query])

  async function createSource() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'book', status: 'reading' }),
      })
      const data = await res.json()
      if (!res.ok || !data.source?.id) {
        alert(`Quelle anlegen fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }
      router.push(`/lernen/quellen/${data.source.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">L03 · Quellen</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <button
              onClick={createSource}
              disabled={creating}
              className="font-mono micro-caps text-garden-accent flex items-center gap-1.5 hover:text-garden-accent-deep transition-colors disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {creating ? '…' : 'Neue Quelle'}
            </button>
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Woraus du <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>lernst.</em>
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            Bücher, Artikel, Podcasts — leg sie an, lies, und destilliere Konzepte daraus.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        {sources.length > 0 && (
          <div className="mb-6 relative pb-3" style={{ borderBottom: '1px solid #E8E3D8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-0 top-1/2 -translate-y-1/2 text-garden-muted-soft pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="In Quellen suchen…"
              className="w-full bg-transparent pl-7 pr-2 py-1 text-[15px] text-garden-ink placeholder:text-garden-muted-soft outline-none"
            />
          </div>
        )}

        {sources.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch keine Quellen.</p>
            <button
              onClick={createSource}
              disabled={creating}
              className="mt-6 font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
            >
              {creating ? '…' : 'Erste Quelle anlegen →'}
            </button>
          </div>
        ) : (
          <div className="pb-24 md:pb-12">
            {filtered.map((s, i) => {
              const count = countMap[s.id] ?? 0
              return (
                <Link
                  key={s.id}
                  href={`/lernen/quellen/${s.id}`}
                  className="group relative block py-5 animate-fade-in transition-colors hover:bg-garden-hairline-soft/40 -mx-3 px-3 rounded"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E3D8' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={s.status} />
                    <span className="font-mono micro-caps text-garden-muted-soft">{TYPE_LABEL[s.type]}</span>
                    <span className="flex-1" />
                    <span className="font-mono micro-caps text-garden-muted-soft tabnums">
                      {count === 0 ? '—' : count === 1 ? '1 Konzept' : `${count} Konzepte`}
                    </span>
                  </div>
                  <h3 className="font-display display-tight balance text-garden-ink" style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 500 }}>
                    {s.title || 'Unbenannte Quelle'}
                  </h3>
                  {s.author && (
                    <p className="font-display italic text-[14px] text-garden-muted leading-relaxed">{s.author}</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
