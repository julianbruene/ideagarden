'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea } from '@/lib/types'

interface Props {
  idea: Idea
  inputCount?: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

export default function IdeaCard({ idea, inputCount = 0 }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const title = idea.title || idea.synthesis?.slice(0, 60) || 'Unbenannte Idee'
  const snippet = idea.synthesis
    ? idea.synthesis.slice(0, 120) + (idea.synthesis.length > 120 ? '…' : '')
    : null

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm('Idee löschen? Das kann nicht rückgängig gemacht werden.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Löschen fehlgeschlagen: ${data.error ?? res.status}`)
        setLoading(false)
        return
      }
      router.refresh()
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  async function handleMarkDone(e: React.MouseEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const mdRes = await fetch(`/api/export/${idea.id}`)
      if (!mdRes.ok) {
        const data = await mdRes.json().catch(() => ({}))
        alert(`Export fehlgeschlagen: ${data.error ?? mdRes.status}`)
        setLoading(false)
        return
      }
      const { markdown } = await mdRes.json()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(idea.title ?? 'idea').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)

      const patchRes = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        alert(`Status-Update fehlgeschlagen: ${data.error ?? patchRes.status}`)
        setLoading(false)
        return
      }
      router.refresh()
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  return (
    <div className="group relative bg-garden-surface rounded-xl border border-garden-border/70 hover:border-garden-accent/30 hover:shadow-paper transition-all duration-200 animate-fade-in">
      {/* ⋮ menu button */}
      <button
        onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v) }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-garden-muted-soft hover:text-garden-muted hover:bg-garden-bg transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8"/>
          <circle cx="12" cy="12" r="1.8"/>
          <circle cx="12" cy="19" r="1.8"/>
        </svg>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(e) => { e.preventDefault(); setMenuOpen(false) }}
          />
          <div className="absolute top-9 right-2 z-30 bg-garden-surface border border-garden-border rounded-xl shadow-paper-lg overflow-hidden min-w-40 animate-fade-in">
            <button
              onClick={handleMarkDone}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-seed hover:bg-garden-seed-light transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Als fertig markieren
            </button>
            <div className="h-px bg-garden-border/60" />
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-danger hover:bg-garden-danger-light transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
              Löschen
            </button>
          </div>
        </>
      )}

      <Link href={`/garden/${idea.id}`} className="block p-5 pr-10">
        {/* Kind label */}
        <p className="text-[9px] uppercase tracking-[0.15em] text-garden-accent font-medium mb-2.5">
          Idee
        </p>

        <h3 className="font-display text-lg text-garden-text leading-snug mb-2 line-clamp-2" style={{ fontWeight: 500 }}>
          {title}
        </h3>

        {snippet ? (
          <p className="font-serif text-[13px] text-garden-muted leading-relaxed line-clamp-3 mb-4" style={{ fontWeight: 400 }}>
            {snippet}
          </p>
        ) : (
          <p className="text-xs text-garden-muted-soft italic mb-4">Noch keine Synthese</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-dashed border-garden-border">
          <span className="text-[10px] text-garden-muted-soft tracking-wide">{formatDate(idea.created_at)}</span>
          <span className="text-[10px] text-garden-muted-soft tracking-wide">
            {inputCount} {inputCount === 1 ? 'Note' : 'Notes'}
          </span>
        </div>
      </Link>
    </div>
  )
}
