'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Project } from '@/lib/types'

interface Props {
  initialTexts: Project[]
  chapterCount: Record<string, number>
  chapterDone: Record<string, number>
}

export default function FictionClient({ initialTexts, chapterCount, chapterDone }: Props) {
  const [texts] = useState<Project[]>(initialTexts)
  const [choosing, setChoosing] = useState(false)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  async function create(kind: 'single' | 'book') {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, genre: 'fiction' }),
      })
      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        alert(`Anlegen fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }
      router.push(`/fiction/${data.project.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">F01 · Texte</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <button
              onClick={() => setChoosing(true)}
              disabled={creating}
              className="font-mono micro-caps text-garden-accent flex items-center gap-1.5 hover:text-garden-accent-deep transition-colors disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {creating ? '…' : 'Neuer Text'}
            </button>
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Was willst du <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>erzählen?</em>
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            Kurzgeschichten und Romane — Figuren, Szenen, Kapitel, Stück für Stück.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        {texts.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch kein Text.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Eine Kurzgeschichte oder ein Roman — fang an.
            </p>
            <button
              onClick={() => setChoosing(true)}
              disabled={creating}
              className="mt-6 font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
            >
              {creating ? '…' : 'Ersten Text anlegen →'}
            </button>
          </div>
        ) : (
          <div className="pb-24 md:pb-12">
            {texts.map((t, i) => {
              const isBook = t.kind === 'book'
              const total = chapterCount[t.id] ?? 0
              const done = chapterDone[t.id] ?? 0
              return (
                <Link
                  key={t.id}
                  href={`/fiction/${t.id}`}
                  className="group relative block py-5 animate-fade-in transition-colors hover:bg-garden-hairline-soft/40 -mx-3 px-3 rounded"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E3D8' }}
                >
                  <div className="flex items-baseline gap-3 mb-1">
                    <h3
                      className="flex-1 font-display display-tight balance text-garden-ink"
                      style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 500 }}
                    >
                      {t.title || (isBook ? 'Unbenannter Roman' : 'Unbenannte Kurzgeschichte')}
                    </h3>
                    <span className="font-mono micro-caps text-garden-muted-soft flex-shrink-0 tabnums">
                      {isBook
                        ? (total === 0 ? 'Roman' : `Roman · ${done}/${total} Kap.`)
                        : 'Kurzgeschichte'}
                    </span>
                  </div>
                  {t.kernidee && (
                    <p className="font-display italic text-[14px] text-garden-muted leading-relaxed line-clamp-2">
                      {t.kernidee}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Sidebar />
      <NavBar />

      {/* Choose kind */}
      {choosing && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in" onClick={() => setChoosing(false)}>
          <div
            className="w-full md:max-w-md bg-garden-surface rounded-t-2xl md:rounded-2xl border border-garden-hairline shadow-paper-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-garden-hairline">
              <h3 className="font-display text-garden-ink" style={{ fontSize: 17, fontWeight: 500 }}>Neuer Text</h3>
              <button onClick={() => setChoosing(false)} className="p-1.5 rounded-lg text-garden-muted hover:text-garden-ink transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-2.5">
              <button
                onClick={() => create('single')}
                disabled={creating}
                className="w-full text-left p-4 rounded-xl border border-garden-hairline hover:border-garden-accent/40 hover:bg-garden-accent-soft/30 transition-all disabled:opacity-50"
              >
                <h4 className="font-display text-garden-ink mb-1" style={{ fontSize: 15, fontWeight: 500 }}>Kurzgeschichte</h4>
                <p className="text-[13px] text-garden-muted leading-relaxed">
                  Ein einzelner Text mit eigenem Schreibeditor. Kein Kapitel-Überbau.
                </p>
              </button>
              <button
                onClick={() => create('book')}
                disabled={creating}
                className="w-full text-left p-4 rounded-xl border border-garden-hairline hover:border-garden-accent/40 hover:bg-garden-accent-soft/30 transition-all disabled:opacity-50"
              >
                <h4 className="font-display text-garden-ink mb-1" style={{ fontSize: 15, fontWeight: 500 }}>Roman</h4>
                <p className="text-[13px] text-garden-muted leading-relaxed">
                  Mehrere Kapitel, Prämisse, Book Dump. Geschrieben wird in den Kapiteln.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
