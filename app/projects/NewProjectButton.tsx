'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectKind } from '@/lib/types'

export default function NewProjectButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function create(kind: ProjectKind) {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        const msg = data?.error ?? `Fehler ${res.status}`
        console.error('[new project]', msg, data)
        setError(msg)
        setLoading(false)
        return
      }
      setOpen(false)
      router.push(`/projects/${data.project.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="font-mono micro-caps text-garden-accent flex items-center gap-1.5 hover:text-garden-accent-deep transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Neues Projekt
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
          <div className="w-full md:max-w-md bg-garden-surface rounded-t-2xl md:rounded-2xl border border-garden-border shadow-paper-lg flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-garden-border">
              <div>
                <h3 className="font-display text-lg text-garden-text" style={{ fontWeight: 500 }}>Neues Projekt</h3>
                <p className="text-xs text-garden-muted-soft mt-0.5">Was willst du anlegen?</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-garden-muted hover:text-garden-text transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Choices */}
            <div className="p-4 space-y-2.5">
              <button
                onClick={() => create('single')}
                disabled={loading}
                className="w-full text-left p-4 rounded-xl border border-garden-border/70 hover:border-garden-accent/40 hover:bg-garden-accent-light/30 transition-all disabled:opacity-50 group"
              >
                <h4 className="font-display text-base text-garden-text mb-1" style={{ fontWeight: 500 }}>
                  Einzeltext
                </h4>
                <p className="text-xs text-garden-muted leading-relaxed">
                  Newsletter, Essay, Kapitel — ein abgeschlossener Text mit eigenem Schreibeditor.
                </p>
              </button>

              <button
                onClick={() => create('book')}
                disabled={loading}
                className="w-full text-left p-4 rounded-xl border border-garden-border/70 hover:border-garden-seed/40 hover:bg-garden-seed-light/40 transition-all disabled:opacity-50 group"
              >
                <h4 className="font-display text-base text-garden-text mb-1" style={{ fontWeight: 500 }}>
                  Buch
                </h4>
                <p className="text-xs text-garden-muted leading-relaxed">
                  Mehrere Kapitel zusammen. Container — Schreiben passiert in den einzelnen Kapiteln.
                </p>
              </button>
            </div>

            {error && (
              <div className="px-4 pb-4">
                <p className="text-xs text-garden-danger bg-garden-danger-light rounded-lg px-3 py-2">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
