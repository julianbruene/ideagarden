'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/types'

interface Props {
  onPick: (projectId: string) => void
  onClose: () => void
}

export default function SendToProjectModal({ onPick, onClose }: Props) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        if (data.error) { setError(data.error); setProjects([]); return }
        // Active top-level projects only (singles + books).
        const list = (data.projects ?? []).filter((p: Project) => p.status === 'active')
        setProjects(list)
      })
      .catch((e) => { if (active) { setError(String(e)); setProjects([]) } })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    if (!projects) return []
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => (p.title ?? '').toLowerCase().includes(q))
  }, [projects, query])

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-20 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-garden-surface rounded-2xl border border-garden-hairline shadow-paper-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-garden-hairline">
          <h3 className="font-display text-garden-ink mb-2" style={{ fontSize: 17, fontWeight: 500 }}>In welches Projekt?</h3>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen…"
            className="w-full bg-garden-bg border border-garden-hairline rounded-lg px-3 py-1.5 text-[14px] text-garden-ink outline-none focus:border-garden-accent/40"
          />
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {projects === null ? (
            <div className="px-5 py-6 text-center">
              <span className="inline-block w-4 h-4 border-2 border-garden-muted-soft border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="px-5 py-6 text-center">
              <p className="font-display italic text-garden-muted">Konnte Projekte nicht laden.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="font-display italic text-garden-muted">
                {projects.length === 0 ? 'Noch keine aktiven Projekte.' : 'Keine Treffer.'}
              </p>
            </div>
          ) : (
            filtered.map((p) => {
              const isBook = p.kind === 'book'
              return (
                <button
                  key={p.id}
                  onClick={() => onPick(p.id)}
                  className="w-full text-left px-5 py-2.5 hover:bg-garden-hairline-soft/40 transition-colors flex items-center gap-2"
                >
                  <span className="flex-1 min-w-0 font-display text-garden-ink truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                    {p.title || (isBook ? 'Unbenanntes Buch' : 'Unbenanntes Projekt')}
                  </span>
                  <span className="flex-shrink-0 font-mono micro-caps text-garden-muted-soft">
                    {isBook ? 'Buch · Book Dump' : 'Projekt'}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-garden-hairline flex justify-end">
          <button
            onClick={onClose}
            className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
