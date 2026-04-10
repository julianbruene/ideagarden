'use client'

import { useState } from 'react'
import type { Idea } from '@/lib/types'

interface Props {
  ideas: Idea[]
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function DoneClient({ ideas }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function downloadMarkdown(idea: Idea) {
    if (downloading) return
    setDownloading(idea.id)
    try {
      const res = await fetch(`/api/export/${idea.id}`)
      const { markdown } = await res.json()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(idea.title ?? 'idea').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-3">
      {ideas.map((idea) => (
        <div
          key={idea.id}
          className="bg-garden-surface rounded-2xl border border-garden-border p-4 animate-fade-in"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-garden-text truncate">
                {idea.title || 'Untitled idea'}
              </h3>
              {idea.synthesis && (
                <p className="text-xs text-garden-muted mt-1 leading-relaxed line-clamp-2">
                  {idea.synthesis}
                </p>
              )}
              <p className="text-[10px] text-garden-muted/60 mt-2">
                Completed {formatDate(idea.completed_at)}
              </p>
            </div>

            <button
              onClick={() => downloadMarkdown(idea)}
              disabled={downloading === idea.id}
              className="flex-shrink-0 p-2 rounded-xl border border-garden-border bg-garden-bg hover:bg-white text-garden-muted hover:text-garden-text transition-all disabled:opacity-40"
              title="Download as Markdown"
            >
              {downloading === idea.id ? (
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
