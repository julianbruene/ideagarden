'use client'

import { useState } from 'react'

export interface DoneItem {
  id: string
  kind: 'idea' | 'project'
  title: string | null
  synthesis: string | null
  completed_at: string | null
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

export default function DoneClient({ items }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null)

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

  return (
    <div className="space-y-3">
      {items.map((item) => (
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
                {item.title || (item.kind === 'project' ? 'Unbenanntes Projekt' : 'Unbenannte Idee')}
              </h3>
              {item.synthesis && (
                <p className="text-xs text-garden-muted mt-1 leading-relaxed line-clamp-2">
                  {item.synthesis}
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
  )
}
