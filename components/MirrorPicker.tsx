'use client'

import { useEffect, useState } from 'react'

interface Container {
  id: string
  title: string | null
}

interface Props {
  noteId: string
  // Container of the source note — excluded from the picker list
  excludeIdeaId?: string | null
  excludeProjectId?: string | null
  onClose: () => void
  onMirrored?: () => void
}

export default function MirrorPicker({ noteId, excludeIdeaId, excludeProjectId, onClose, onMirrored }: Props) {
  const [loading, setLoading] = useState(true)
  const [ideas, setIdeas] = useState<Container[]>([])
  const [projects, setProjects] = useState<Container[]>([])
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/containers')
      .then((r) => r.json())
      .then((data) => {
        setIdeas((data.ideas ?? []).filter((i: Container) => i.id !== excludeIdeaId))
        setProjects((data.projects ?? []).filter((p: Container) => p.id !== excludeProjectId))
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [excludeIdeaId, excludeProjectId])

  async function mirror(target_type: 'idea' | 'project', target_id: string) {
    if (submitting) return
    setSubmitting(target_id)
    try {
      const res = await fetch(`/api/inputs/${noteId}/mirror`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type, target_id }),
      })
      if (res.ok) {
        onMirrored?.()
        onClose()
      } else {
        const { error } = await res.json()
        alert(error ?? 'Spiegeln fehlgeschlagen')
      }
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
      <div className="w-full md:max-w-md bg-garden-surface rounded-t-2xl md:rounded-2xl border border-garden-border shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-garden-border">
          <div>
            <h3 className="text-sm font-semibold text-garden-text">Note spiegeln</h3>
            <p className="text-xs text-garden-muted mt-0.5">
              Wähle Ziel — Änderungen syncen überall
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-garden-muted hover:text-garden-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && (
            <p className="text-xs text-garden-muted italic text-center py-8">Lade…</p>
          )}

          {!loading && ideas.length === 0 && projects.length === 0 && (
            <p className="text-xs text-garden-muted italic text-center py-8">
              Keine anderen Ideen oder Projekte.
            </p>
          )}

          {ideas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-garden-muted/70 font-medium mb-2">
                Garden Ideen
              </p>
              <ul className="space-y-1.5">
                {ideas.map((idea) => (
                  <li key={idea.id}>
                    <button
                      onClick={() => mirror('idea', idea.id)}
                      disabled={!!submitting}
                      className="w-full text-left px-3 py-2 rounded-xl bg-garden-bg/60 hover:bg-garden-accent-light border border-garden-border/50 hover:border-garden-accent/30 transition-colors disabled:opacity-50"
                    >
                      <p className="text-sm font-medium text-garden-text truncate">
                        {idea.title || 'Unbenannte Idee'}
                      </p>
                      {submitting === idea.id && (
                        <p className="text-[10px] text-garden-accent mt-0.5">Spiegele…</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-garden-muted/70 font-medium mb-2">
                Projekte
              </p>
              <ul className="space-y-1.5">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button
                      onClick={() => mirror('project', project.id)}
                      disabled={!!submitting}
                      className="w-full text-left px-3 py-2 rounded-xl bg-garden-bg/60 hover:bg-garden-seed-light border border-garden-border/50 hover:border-garden-seed/30 transition-colors disabled:opacity-50"
                    >
                      <p className="text-sm font-medium text-garden-text truncate">
                        {project.title || 'Unbenanntes Projekt'}
                      </p>
                      {submitting === project.id && (
                        <p className="text-[10px] text-garden-seed mt-0.5">Spiegele…</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
