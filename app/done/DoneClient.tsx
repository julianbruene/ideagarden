'use client'

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
  const [downloading, setDownloading] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.searchBlob.includes(q))
  }, [items, query])

  async function downloadMarkdown(item: DoneItem) {
    if (downloading) return
    setDownloading(item.id)
    try {
      const endpoint = item.kind === 'project'
        ? `/api/projects/${item.id}/export`
        : `/api/export/${item.id}`
      const res = await fetch(endpoint)
      const { markdown } = await res.json()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const prefix = item.kind === 'project' ? 'projekt' : 'idee'
      a.download = `${(item.title ?? prefix).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">&#x2705;</div>
        <p className="text-sm text-garden-muted">Noch nichts abgeschlossen.</p>
        <p className="text-xs text-garden-muted/60 mt-1">
          Fertige Ideen und Projekte landen hier.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-3 relative">
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-garden-muted/60 pointer-events-none"
        >
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Im Kompost suchen…"
          className="w-full bg-garden-surface border border-garden-border rounded-xl pl-9 pr-9 py-2.5 text-sm text-garden-text placeholder:text-garden-muted/50 outline-none focus:border-garden-accent/50 focus:ring-2 focus:ring-garden-accent/10 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-garden-muted/60 hover:text-garden-text transition-colors"
            title="Suche löschen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Result count */}
      {query && (
        <p className="text-[11px] text-garden-muted/70 mb-3">
          {filtered.length === 0
            ? 'Keine Treffer.'
            : filtered.length === 1
              ? '1 Treffer'
              : `${filtered.length} Treffer`}
        </p>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={`${item.kind}-${item.id}`}
            className="bg-garden-surface rounded-2xl border border-garden-border p-4 animate-fade-in"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${
                    item.kind === 'project'
                      ? 'text-garden-seed bg-garden-seed-light'
                      : 'text-garden-accent bg-garden-accent-light'
                  }`}>
                    {item.kind === 'project' ? 'Projekt' : 'Idee'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-garden-text truncate">
                  {highlight(
                    item.title || (item.kind === 'project' ? 'Unbenanntes Projekt' : 'Unbenannte Idee'),
                    query,
                  )}
                </h3>
                {item.synthesis && (
                  <p className="text-xs text-garden-muted mt-1 leading-relaxed line-clamp-2">
                    {highlight(item.synthesis, query)}
                  </p>
                )}
                <p className="text-[10px] text-garden-muted/60 mt-2">
                  Abgeschlossen {formatDate(item.completed_at)}
                </p>
              </div>

              <button
                onClick={() => downloadMarkdown(item)}
                disabled={downloading === item.id}
                className="flex-shrink-0 p-2 rounded-xl border border-garden-border bg-garden-bg hover:bg-white text-garden-muted hover:text-garden-text transition-all disabled:opacity-40"
                title="Als Markdown herunterladen"
              >
                {downloading === item.id ? (
                  <span className="w-4 h-4 border-2 border-garden-muted border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
