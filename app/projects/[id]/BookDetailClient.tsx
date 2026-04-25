'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import NavBar from '@/components/NavBar'
import type { Project } from '@/lib/types'

interface Props {
  book: Project
  initialChapters: Project[]
}

interface SortableChapterProps {
  chapter: Project
  index: number
}

function SortableChapter({ chapter, index }: SortableChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isDone = chapter.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-garden-surface rounded-xl border transition-all ${
        isDone
          ? 'border-garden-seed/40 bg-garden-seed-light/40'
          : 'border-garden-border/70'
      } ${isDragging ? 'shadow-paper-lg' : 'hover:border-garden-accent/30 hover:shadow-paper'}`}
    >
      <div className="flex items-stretch">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-3 text-garden-muted-soft hover:text-garden-text cursor-grab active:cursor-grabbing touch-none"
          title="Ziehen zum Sortieren"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
          </svg>
        </button>

        <Link href={`/projects/${chapter.id}`} className="flex-1 min-w-0 py-3 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] tabular-nums text-garden-muted-soft font-medium">
              {String(index + 1).padStart(2, '0')}
            </span>
            {isDone && (
              <span className="text-[9px] uppercase tracking-widest text-garden-seed font-semibold px-1.5 py-0.5 rounded-full bg-garden-seed-light">
                Fertig
              </span>
            )}
          </div>
          <h3 className="font-display text-base text-garden-text leading-snug truncate" style={{ fontWeight: 500 }}>
            {chapter.title || 'Unbenanntes Kapitel'}
          </h3>
          {chapter.kernidee && (
            <p className="font-serif text-xs text-garden-muted leading-relaxed line-clamp-2 mt-1">
              {chapter.kernidee}
            </p>
          )}
        </Link>
      </div>
    </div>
  )
}

export default function BookDetailClient({ book: initialBook, initialChapters }: Props) {
  const [book, setBook] = useState<Project>(initialBook)
  const [chapters, setChapters] = useState<Project[]>(initialChapters)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(book.title ?? '')
  const [kernideeDraft, setKernideeDraft] = useState(book.kernidee ?? '')
  const kernideeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [creating, setCreating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (kernideeDraft === (book.kernidee ?? '')) return
    if (kernideeSaveTimer.current) clearTimeout(kernideeSaveTimer.current)
    kernideeSaveTimer.current = setTimeout(async () => {
      const trimmed = kernideeDraft.trim() || null
      await fetch(`/api/projects/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kernidee: trimmed }),
      })
      setBook((b) => ({ ...b, kernidee: trimmed }))
    }, 800)
    return () => { if (kernideeSaveTimer.current) clearTimeout(kernideeSaveTimer.current) }
  }, [kernideeDraft, book.id, book.kernidee])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const doneCount = chapters.filter((c) => c.status === 'done').length
  const total = chapters.length
  const allDone = total > 0 && doneCount === total

  async function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleDraft.trim() || null
    if (trimmed === book.title) return
    setBook((b) => ({ ...b, title: trimmed }))
    await fetch(`/api/projects/${book.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = chapters.findIndex((c) => c.id === active.id)
    const newIndex = chapters.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(chapters, oldIndex, newIndex)
    setChapters(reordered.map((c, i) => ({ ...c, chapter_order: i })))
    await fetch(`/api/projects/${book.id}/reorder-chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: reordered.map((c) => c.id) }),
    })
  }

  async function addChapter() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'single',
          parent_project_id: book.id,
          title: `Kapitel ${chapters.length + 1}`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        alert(`Kapitel anlegen fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }
      router.push(`/projects/${data.project.id}`)
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Buch löschen? Alle Kapitel werden mit gelöscht. Das kann nicht rückgängig gemacht werden.')) return
    try {
      const res = await fetch(`/api/projects/${book.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Löschen fehlgeschlagen: ${data.error ?? res.status}`)
        return
      }
      router.push('/projects')
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleMarkDone() {
    if (completing) return
    if (!allDone) {
      const proceed = window.confirm(
        `Erst ${doneCount} von ${total} Kapiteln sind fertig. Trotzdem das ganze Buch abschließen und exportieren?`
      )
      if (!proceed) return
    } else {
      const confirmed = window.confirm('Buch als fertig markieren? Wird als ein einziges Markdown heruntergeladen und ins Archiv verschoben.')
      if (!confirmed) return
    }
    setCompleting(true)
    try {
      const mdRes = await fetch(`/api/projects/${book.id}/book-export`)
      if (!mdRes.ok) {
        const data = await mdRes.json().catch(() => ({}))
        alert(`Export fehlgeschlagen: ${data.error ?? mdRes.status}`)
        setCompleting(false)
        return
      }
      const { markdown } = await mdRes.json()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(book.title ?? 'buch').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)

      const patchRes = await fetch(`/api/projects/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        alert(`Status-Update fehlgeschlagen: ${data.error ?? patchRes.status}`)
        setCompleting(false)
        return
      }
      router.push('/done')
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-md border-b border-garden-border/60 pt-safe">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <Link
            href="/projects"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-border/40 text-garden-muted transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] uppercase tracking-widest text-garden-seed font-semibold">
                Buch
              </span>
            </div>
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setTitleDraft(book.title ?? ''); setEditingTitle(false) }
                }}
                className="w-full bg-transparent font-display text-xl md:text-2xl text-garden-text outline-none border-b border-garden-accent"
                placeholder="Buchtitel hinzufügen…"
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10) }}
                className="font-display text-xl md:text-2xl text-garden-text hover:text-garden-accent transition-colors truncate block max-w-full text-left"
                style={{ fontWeight: 500 }}
              >
                {book.title || 'Unbenanntes Buch'}
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-garden-muted/60 hover:text-garden-text hover:bg-garden-bg transition-colors"
              title="Weitere Aktionen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.8"/>
                <circle cx="12" cy="12" r="1.8"/>
                <circle cx="12" cy="19" r="1.8"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-1 z-30 bg-garden-surface border border-garden-border rounded-xl shadow-paper-lg overflow-hidden min-w-56 animate-fade-in">
                  <button
                    onClick={() => { setMenuOpen(false); handleMarkDone() }}
                    disabled={completing || book.status === 'done'}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-seed hover:bg-garden-seed-light transition-colors text-left disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Buch abschließen & exportieren
                  </button>
                  <div className="h-px bg-garden-border/60" />
                  <button
                    onClick={() => { setMenuOpen(false); handleDelete() }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-danger hover:bg-garden-danger-light transition-colors text-left"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                    Buch löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Kernidee ── */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
        <label className="text-[9px] uppercase tracking-widest text-garden-muted-soft font-medium block mb-1">
          Kernidee
        </label>
        <textarea
          value={kernideeDraft}
          onChange={(e) => setKernideeDraft(e.target.value)}
          placeholder="Welcher eine Gedanke trägt dieses Buch?"
          rows={1}
          className="w-full bg-transparent font-serif text-base md:text-lg text-garden-text outline-none placeholder:text-garden-muted-soft/60 resize-none leading-relaxed"
          style={{ fontStyle: kernideeDraft ? 'normal' : 'italic' }}
        />
      </div>

      {/* ── Progress ── */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 mb-3">
        <div className="flex items-center justify-between text-xs text-garden-muted-soft mb-1.5">
          <span>{doneCount} von {total} Kapiteln fertig</span>
          {total > 0 && <span className="tabular-nums">{Math.round((doneCount / total) * 100)} %</span>}
        </div>
        <div className="h-1 bg-garden-border/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-garden-seed transition-all duration-500"
            style={{ width: total === 0 ? '0%' : `${(doneCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Chapter list ── */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-widest text-garden-muted font-medium">Kapitel</p>
          <button
            onClick={addChapter}
            disabled={creating}
            className="text-xs px-3 py-1.5 rounded-lg bg-garden-accent text-white font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-50 shadow-paper"
          >
            {creating ? '…' : '+ Kapitel'}
          </button>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-serif text-base text-garden-muted italic mb-3">Noch keine Kapitel.</p>
            <button
              onClick={addChapter}
              disabled={creating}
              className="text-sm text-garden-accent hover:underline"
            >
              Erstes Kapitel anlegen
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chapters.map((chapter, i) => (
                  <SortableChapter key={chapter.id} chapter={chapter} index={i} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <NavBar />
    </div>
  )
}
