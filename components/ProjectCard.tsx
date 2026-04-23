'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

interface Props {
  project: Project
  inputCount?: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

export default function ProjectCard({ project, inputCount = 0 }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const title = project.title || project.synthesis?.slice(0, 60) || 'Unbenanntes Projekt'
  const snippet = project.synthesis
    ? project.synthesis.slice(0, 120) + (project.synthesis.length > 120 ? '…' : '')
    : null

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm('Projekt löschen? Das kann nicht rückgängig gemacht werden.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
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
      const mdRes = await fetch(`/api/projects/${project.id}/export`)
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
      a.download = `${(project.title ?? 'projekt').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)

      const patchRes = await fetch(`/api/projects/${project.id}`, {
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
    <div className="relative bg-garden-surface rounded-2xl border border-garden-border hover:border-garden-muted/40 transition-all animate-fade-in">
      <button
        onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v) }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-garden-muted/50 hover:text-garden-muted hover:bg-garden-bg transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8"/>
          <circle cx="12" cy="12" r="1.8"/>
          <circle cx="12" cy="19" r="1.8"/>
        </svg>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(e) => { e.preventDefault(); setMenuOpen(false) }}
          />
          <div className="absolute top-9 right-2 z-30 bg-white border border-garden-border rounded-xl shadow-lg overflow-hidden min-w-36 animate-fade-in">
            <button
              onClick={handleMarkDone}
              disabled={loading}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-garden-seed hover:bg-garden-seed-light transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Als fertig markieren
            </button>
            <div className="h-px bg-garden-border" />
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
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

      <Link href={`/projects/${project.id}`} className="block p-4 pr-10">
        {/* Project badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] uppercase tracking-widest text-garden-seed font-semibold bg-garden-seed-light px-2 py-0.5 rounded-full">
            Projekt
          </span>
        </div>

        <h3 className="text-sm font-semibold text-garden-text leading-snug mb-2 line-clamp-2">
          {title}
        </h3>

        {snippet ? (
          <p className="text-xs text-garden-muted leading-relaxed line-clamp-3 mb-3">
            {snippet}
          </p>
        ) : (
          <p className="text-xs text-garden-muted/50 italic mb-3">Noch keine Synthese</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-garden-border/50">
          <span className="text-[10px] text-garden-muted">{formatDate(project.created_at)}</span>
          <span className="text-[10px] text-garden-muted">
            {inputCount} {inputCount === 1 ? 'Eintrag' : 'Einträge'}
          </span>
        </div>
      </Link>
    </div>
  )
}
