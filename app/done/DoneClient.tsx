'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export interface DoneItem {
  id: string
  kind: 'idea' | 'project'
  title: string | null
  synthesis: string | null
  completed_at: string | null
  searchBlob: string
}

interface Props {
  items: DoneItem[]
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-DE', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// Highlight query matches within a snippet
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
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

export default function DoneClient({ items }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.searchBlob.includes(q))
  }, [items, query])

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
        <p className="font-display italic text-garden-muted">Noch nichts abgeschlossen.</p>
        <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
          Fertige Ideen und Projekte landen hier.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Search bar — flat with hairline */}
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
          placeholder="Im Kompost suchen…"
          className="w-full bg-transparent pl-7 pr-7 py-1 text-[15px] text-garden-ink placeholder:text-garden-muted-soft outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded text-garden-muted-soft hover:text-garden-ink transition-colors"
            title="Suche löschen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Result count */}
      {query && (
        <p className="font-mono micro-caps text-garden-muted-soft mb-4">
          {filtered.length === 0
            ? 'Keine Treffer'
            : filtered.length === 1
              ? '1 Treffer'
              : `${filtered.length} Treffer`}
        </p>
      )}

      {/* List — clickable hairline rows */}
      <div>
        {filtered.map((item, i) => {
          const href = item.kind === 'project' ? `/projects/${item.id}` : `/garden/${item.id}`
          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={href}
              className="group relative block py-5 animate-fade-in transition-colors hover:bg-garden-hairline-soft/40 -mx-3 px-3 rounded"
              style={{
                borderTop: i === 0 ? 'none' : '1px solid #E8E3D8',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono micro-caps text-garden-accent">
                      {item.kind === 'project' ? 'Projekt' : 'Idee'}
                    </span>
                    <span className="font-mono micro-caps text-garden-muted-soft">
                      · abgeschlossen {formatDate(item.completed_at)}
                    </span>
                  </div>
                  <h3
                    className="font-display display-tight balance text-garden-ink"
                    style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 400 }}
                  >
                    {highlight(
                      item.title || (item.kind === 'project' ? 'Unbenanntes Projekt' : 'Unbenannte Idee'),
                      query,
                    )}
                  </h3>
                  {item.synthesis && (
                    <p className="font-display italic text-[13px] text-garden-muted mt-2 leading-relaxed line-clamp-2">
                      {highlight(item.synthesis, query)}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 mt-1 font-mono micro-caps text-garden-muted-soft group-hover:text-garden-accent transition-colors flex items-center gap-1">
                  Öffnen
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
