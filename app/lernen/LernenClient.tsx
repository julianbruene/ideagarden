'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Concept } from '@/lib/types'

interface Props {
  initialConcepts: Concept[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text
  const q = query.toLowerCase()
  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let i = 0
  let start = lower.indexOf(q, i)
  while (start >= 0) {
    if (start > i) parts.push(text.slice(i, start))
    parts.push(
      <mark key={`m-${start}`} className="bg-amber-100 text-garden-text rounded px-0.5">
        {text.slice(start, start + query.length)}
      </mark>
    )
    i = start + query.length
    start = lower.indexOf(q, i)
  }
  if (i < text.length) parts.push(text.slice(i))
  return parts
}

export default function LernenClient({ initialConcepts }: Props) {
  const [concepts] = useState<Concept[]>(initialConcepts)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  // Searchable blob per concept — title, summary, own_example, body, source
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return concepts
    return concepts.filter((c) =>
      [c.title, c.summary, c.own_example, c.body, c.source]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q))
    )
  }, [concepts, query])

  async function createConcept() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.concept?.id) {
        alert(`Konzept anlegen fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }
      router.push(`/lernen/${data.concept.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">L01 · Konzepte</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <button
              onClick={createConcept}
              disabled={creating}
              className="font-mono micro-caps text-garden-accent flex items-center gap-1.5 hover:text-garden-accent-deep transition-colors disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {creating ? '…' : 'Neues Konzept'}
            </button>
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Was hast du <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>verstanden?</em>
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            In eigenen Worten. Mit einem Beispiel, das hängenbleibt. Verbunden, was zusammengehört.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        {/* Search bar */}
        {concepts.length > 0 && (
          <div className="mb-6 relative pb-3" style={{ borderBottom: '1px solid #E8E3D8' }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-0 top-1/2 -translate-y-1/2 text-garden-muted-soft pointer-events-none"
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="In Konzepten suchen…"
              className="w-full bg-transparent pl-7 pr-7 py-1 text-[15px] text-garden-ink placeholder:text-garden-muted-soft outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded text-garden-muted-soft hover:text-garden-ink transition-colors"
                title="Suche löschen"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {concepts.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch nichts gelernt.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Schreib dein erstes Konzept in eigenen Worten.
            </p>
            <button
              onClick={createConcept}
              disabled={creating}
              className="mt-6 font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
            >
              {creating ? '…' : 'Erstes Konzept anlegen →'}
            </button>
          </div>
        ) : (
          <>
            {query && (
              <p className="font-mono micro-caps text-garden-muted-soft mb-4">
                {filtered.length === 0
                  ? 'Keine Treffer'
                  : filtered.length === 1
                    ? '1 Treffer'
                    : `${filtered.length} Treffer`}
              </p>
            )}
            <div className="pb-24 md:pb-12">
              {filtered.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/lernen/${c.id}`}
                  className="group relative block py-5 animate-fade-in transition-colors hover:bg-garden-hairline-soft/40 -mx-3 px-3 rounded"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E3D8' }}
                >
                  <h3
                    className="font-display display-tight balance text-garden-ink mb-1"
                    style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 500 }}
                  >
                    {highlight(c.title || 'Unbenanntes Konzept', query)}
                  </h3>
                  {c.summary && (
                    <p className="font-display italic text-[14px] text-garden-muted leading-relaxed line-clamp-2">
                      {highlight(c.summary, query)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {c.source && (
                      <span className="font-mono micro-caps text-garden-muted-soft truncate max-w-[60%]">
                        ↳ {c.source}
                      </span>
                    )}
                    <span className="font-mono micro-caps text-garden-muted-soft">
                      {formatDate(c.updated_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
