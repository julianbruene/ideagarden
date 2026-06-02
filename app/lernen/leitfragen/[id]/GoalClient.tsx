'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Goal } from '@/lib/types'

export interface ReaderItem {
  concept: { id: string; title: string | null; summary: string | null }
  reflection: string | null
  updated_at: string
}

interface Props {
  initialGoal: Goal
  initialReader: ReaderItem[]
}

type SaveState = 'saved' | 'dirty' | 'saving'

function useAutoSize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ref, value])
}

export default function GoalClient({ initialGoal, initialReader }: Props) {
  const [goal, setGoal] = useState<Goal>(initialGoal)
  const [title, setTitle] = useState(goal.title ?? '')
  const [description, setDescription] = useState(goal.description ?? '')
  const [reader] = useState<ReaderItem[]>(initialReader)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useAutoSize(descRef, description)

  // Save mechanism — same pattern as ConceptClient (debounce + blur + Cmd-S + unmount flush)
  const dirty =
    title !== (goal.title ?? '') ||
    description !== (goal.description ?? '')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const draftRef = useRef({ title, description })
  draftRef.current = { title, description }
  const goalIdRef = useRef(goal.id)
  goalIdRef.current = goal.id
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const savingRef = useRef(false)

  function currentUpdates() {
    const d = draftRef.current
    return {
      title: d.title.trim() || null,
      description: d.description.trim() || null,
    }
  }

  async function saveNow() {
    if (savingRef.current) return
    if (!dirtyRef.current) return
    savingRef.current = true
    setSaveState('saving')
    try {
      const res = await fetch(`/api/goals/${goalIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUpdates()),
      })
      if (res.ok) {
        const { goal: updated } = await res.json()
        setGoal(updated)
        setSaveState('saved')
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Speichern fehlgeschlagen: ${err.error ?? res.status}`)
        setSaveState('dirty')
      }
    } catch (e) {
      alert(`Netzwerkfehler: ${e instanceof Error ? e.message : 'unbekannt'}`)
      setSaveState('dirty')
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    if (dirty) setSaveState((s) => s === 'saving' ? s : 'dirty')
    else setSaveState('saved')
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => { saveNow() }, 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return
      try {
        fetch(`/api/goals/${goalIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUpdates()),
          keepalive: true,
        })
      } catch { /* best effort */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function deleteGoal() {
    if (!window.confirm('Leitfrage löschen? Alle Reflexionen zu Konzepten werden ebenfalls entfernt (die Konzepte selbst bleiben).')) return
    await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
    router.push('/lernen/leitfragen')
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="sticky top-0 z-30 bg-garden-bg/92 backdrop-blur-md border-b border-garden-hairline pt-safe">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <Link
            href="/lernen/leitfragen"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-hairline-soft text-garden-muted hover:text-garden-ink transition-colors"
            title="Zurück zu Leitfragen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-mono micro-caps text-garden-accent">Leitfrage</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          {saveState === 'saving' ? (
            <span className="font-mono micro-caps text-garden-muted-soft flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-garden-accent animate-pulse" />
              speichert…
            </span>
          ) : saveState === 'dirty' ? (
            <button
              onClick={saveNow}
              className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors flex items-center gap-1.5"
              title="Speichern (⌘S)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-garden-accent" />
              Speichern
            </button>
          ) : (
            <span className="font-mono micro-caps text-garden-muted-soft flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              gespeichert
            </span>
          )}
          <button
            onClick={deleteGoal}
            className="font-mono micro-caps text-garden-muted hover:text-garden-accent transition-colors"
          >
            Löschen
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Title (the question itself) */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveNow}
          placeholder="Wie überwinde ich…?"
          className="w-full bg-transparent font-display text-garden-ink outline-none border-b border-transparent focus:border-garden-accent/40 placeholder:text-garden-muted-soft/70 transition-colors pb-2 italic"
          style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 500, lineHeight: 1.15 }}
        />

        {/* Description */}
        <div className="mt-6">
          <label className="font-mono micro-caps text-garden-accent block mb-1">Worum geht's?</label>
          <textarea
            ref={descRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveNow}
            placeholder="Was meine ich überhaupt damit? Wo kommt diese Frage her? Was hab ich schon versucht?"
            rows={3}
            className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted-soft/70 font-serif pretty leading-relaxed"
            style={{ fontSize: 15 }}
          />
        </div>

        {/* Reader */}
        <div className="mt-10 pt-6 border-t border-garden-hairline">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-accent">Dein Reader</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <span className="font-mono micro-caps text-garden-muted-soft tabnums">
              {reader.length === 0 ? '—' : reader.length === 1 ? '1 Konzept' : `${reader.length} Konzepte`}
            </span>
          </div>

          {reader.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-display italic text-garden-muted-soft">Noch keine Konzepte zu dieser Frage.</p>
              <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
                Auf einer Konzept-Seite kannst du <em className="not-italic font-display italic text-garden-muted">"+ Leitfrage"</em> klicken und diese hier wählen.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reader.map((item) => (
                <div key={item.concept.id} className="border-l-2 border-garden-accent/30 pl-4">
                  <Link
                    href={`/lernen/${item.concept.id}`}
                    className="block hover:text-garden-accent transition-colors"
                  >
                    <h3 className="font-display text-garden-ink" style={{ fontSize: 17, fontWeight: 500 }}>
                      {item.concept.title || 'Unbenanntes Konzept'}
                    </h3>
                    {item.concept.summary && (
                      <p className="font-display italic text-garden-muted text-[13px] leading-relaxed mt-0.5">
                        {item.concept.summary}
                      </p>
                    )}
                  </Link>
                  {item.reflection && (
                    <p className="mt-2 font-serif text-garden-ink leading-relaxed whitespace-pre-wrap pretty" style={{ fontSize: 14 }}>
                      {item.reflection}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-32" />
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
