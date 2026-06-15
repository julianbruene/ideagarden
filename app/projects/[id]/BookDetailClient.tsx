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
import type { Project, Input as InputRow } from '@/lib/types'

interface Props {
  book: Project
  initialChapters: Project[]
  initialBookNotes: InputRow[]
  initialOpenPoints: InputRow[]
}

// ── Progress state ────────────────────────────────────────────────
type ChapterState = 'not_started' | 'in_progress' | 'done'
function chapterState(c: Project): ChapterState {
  if (c.status === 'done') return 'done'
  if (c.writing_content?.trim() || c.outline?.trim() || c.kernidee?.trim()) return 'in_progress'
  return 'not_started'
}

function StateDot({ state }: { state: ChapterState }) {
  const label = state === 'done' ? 'Fertig' : state === 'in_progress' ? 'In Arbeit' : 'Noch nicht begonnen'
  if (state === 'done') {
    return <span title={label} className="w-2 h-2 rounded-full bg-garden-accent flex-shrink-0" />
  }
  if (state === 'in_progress') {
    return (
      <span title={label} className="w-2 h-2 rounded-full border border-garden-accent flex-shrink-0 relative">
        <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-garden-accent" />
      </span>
    )
  }
  return <span title={label} className="w-2 h-2 rounded-full border border-garden-muted-soft flex-shrink-0" />
}

// ── Sortable chapter row with inline-editable function ────────────
interface SortableChapterProps {
  chapter: Project
  index: number
  onFunctionSaved: (id: string, fn: string | null) => void
}

function SortableChapter({ chapter, index, onFunctionSaved }: SortableChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chapter.chapter_function ?? '')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(chapter.chapter_function ?? '') }, [chapter.chapter_function])

  async function saveFunction() {
    setEditing(false)
    const next = draft.trim() || null
    if (next === (chapter.chapter_function ?? null)) return
    onFunctionSaved(chapter.id, next)
    await fetch(`/api/projects/${chapter.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_function: next }),
    })
  }

  const state = chapterState(chapter)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-stretch gap-2 py-3"
      // Hairline between chapters
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 px-1 text-garden-muted-soft/60 hover:text-garden-muted cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
        title="Ziehen zum Sortieren"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/>
          <circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/>
          <circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>
        </svg>
      </button>

      <div className="flex items-center pt-1.5 flex-shrink-0">
        <StateDot state={state} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono micro-caps text-garden-muted-soft tabnums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <Link
            href={`/projects/${chapter.id}`}
            className="font-display text-garden-ink hover:text-garden-accent transition-colors truncate"
            style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.3 }}
          >
            {chapter.title || 'Unbenanntes Kapitel'}
          </Link>
        </div>

        {editing ? (
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveFunction}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFunction() }
              if (e.key === 'Escape') { setDraft(chapter.chapter_function ?? ''); setEditing(false) }
            }}
            autoFocus
            rows={1}
            placeholder="Welche Funktion erfüllt dieses Kapitel im Buch?"
            className="w-full mt-1 bg-transparent resize-none outline-none font-display italic text-garden-muted text-[13px] leading-relaxed placeholder:text-garden-muted-soft/70"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="block w-full text-left mt-1 font-display italic text-[13px] leading-relaxed transition-colors hover:text-garden-ink"
            style={{ color: chapter.chapter_function ? '#5C5650' : '#B8B2A6' }}
          >
            {chapter.chapter_function || 'Funktion festlegen — was tut dieses Kapitel?'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Chapter picker modal (for Book Dump → Chapter assignment) ────
interface PickerProps {
  chapters: Project[]
  onPick: (chapterId: string) => void
  onClose: () => void
}
function ChapterPicker({ chapters, onPick, onClose }: PickerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-garden-surface rounded-2xl border border-garden-hairline shadow-paper-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-garden-hairline">
          <h3 className="font-display text-garden-ink" style={{ fontSize: 17, fontWeight: 500 }}>Welchem Kapitel zuordnen?</h3>
          <p className="font-mono micro-caps text-garden-muted-soft mt-1">Die Notiz wandert dort hin.</p>
        </div>
        {chapters.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="font-display italic text-garden-muted">Noch keine Kapitel.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-garden-hairline-soft/40 transition-colors text-left"
              >
                <span className="font-mono micro-caps text-garden-muted-soft tabnums flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <StateDot state={chapterState(c)} />
                <span className="font-display text-garden-ink truncate" style={{ fontSize: 15 }}>
                  {c.title || 'Unbenanntes Kapitel'}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="px-5 py-3 border-t border-garden-hairline flex justify-end">
          <button onClick={onClose} className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Offene Punkte slide-out panel ────────────────────────────────
// Cards (one row per point) — mirrors the Outline note style.
interface OffenePunkteProps {
  open: boolean
  points: InputRow[]
  draft: string
  setDraft: (s: string) => void
  draftRef: React.RefObject<HTMLTextAreaElement | null>
  adding: boolean
  onAdd: () => void
  editingId: string | null
  editDraft: string
  setEditDraft: (s: string) => void
  onStartEdit: (p: InputRow) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
  onClose: () => void
}
function OffenePunkte({
  open, points, draft, setDraft, draftRef, adding, onAdd,
  editingId, editDraft, setEditDraft, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  onClose,
}: OffenePunkteProps) {
  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-full md:w-[28rem] bg-garden-bg border-l border-garden-hairline shadow-paper-lg transform transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!open}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-garden-hairline flex items-start justify-between gap-3 bg-garden-surface">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono micro-caps text-garden-accent">Offene Punkte</p>
              <span className="font-mono micro-caps text-garden-muted-soft">
                {points.length === 0 ? '—' : points.length}
              </span>
            </div>
            <p className="font-display italic text-garden-muted text-[13px] mt-1 leading-relaxed">
              Fragen, Stichworte, Unsicheres — alles, was wichtig sein könnte, aber noch kein Kapitel hat.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 -mr-1 text-garden-muted hover:text-garden-ink transition-colors"
            title="Schließen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Add input */}
        <form
          onSubmit={(e) => { e.preventDefault(); onAdd() }}
          className="flex-shrink-0 px-5 py-3 border-b border-garden-hairline bg-garden-surface"
        >
          <div className="bg-garden-bg rounded-xl border border-garden-hairline focus-within:border-garden-accent/50 focus-within:ring-2 focus-within:ring-garden-accent/10 transition-all">
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd() }
              }}
              placeholder="Neuer offener Punkt — Frage, Stichwort, Zweifel…"
              rows={2}
              disabled={adding}
              className="w-full bg-transparent resize-none outline-none px-3 py-2 text-garden-ink placeholder:text-garden-muted-soft/70 font-serif leading-relaxed"
              style={{ fontSize: 14 }}
            />
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="font-mono text-[10px] text-garden-muted-soft">↵ speichern · ⇧↵ Zeilenumbruch</span>
              <button
                type="submit"
                disabled={!draft.trim() || adding}
                title="Speichern"
                className="w-6 h-6 rounded-full flex items-center justify-center bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-deep transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>
        </form>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {points.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-display text-2xl text-garden-muted-soft mb-2" style={{ fontWeight: 400 }}>—</p>
              <p className="font-display italic text-garden-muted">Noch keine offenen Punkte.</p>
            </div>
          ) : (
            points.map((p) => {
              const isEditing = editingId === p.id
              return (
                <div
                  key={p.id}
                  className="group relative bg-garden-surface rounded-xl border border-garden-hairline hover:border-garden-accent/30 transition-all overflow-hidden animate-fade-in"
                >
                  {isEditing ? (
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={onSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); onCancelEdit() }
                        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSaveEdit() }
                      }}
                      autoFocus
                      rows={Math.max(2, Math.min(10, editDraft.split('\n').length + 1))}
                      className="w-full bg-white border-b border-garden-accent/30 px-3 py-2.5 text-garden-ink leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/10"
                      style={{ fontSize: 14 }}
                    />
                  ) : (
                    <button
                      onClick={() => onStartEdit(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/40 transition-colors"
                      title="Klick zum Bearbeiten"
                    >
                      <p
                        className="text-garden-ink leading-relaxed whitespace-pre-wrap break-words font-serif"
                        style={{ fontSize: 14 }}
                      >
                        {p.content}
                      </p>
                    </button>
                  )}
                  {!isEditing && (
                    <button
                      onClick={() => onDelete(p.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-garden-muted-soft hover:text-garden-accent rounded"
                      title="Löschen"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function BookDetailClient({ book: initialBook, initialChapters, initialBookNotes, initialOpenPoints }: Props) {
  const [book, setBook] = useState<Project>(initialBook)
  const [chapters, setChapters] = useState<Project[]>(initialChapters)
  const [bookNotes, setBookNotes] = useState<InputRow[]>(initialBookNotes)
  const [openPoints, setOpenPoints] = useState<InputRow[]>(initialOpenPoints)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(book.title ?? '')
  const [kernideeDraft, setKernideeDraft] = useState(book.kernidee ?? '')
  const [zielleserDraft, setZielleserDraft] = useState(book.zielleser ?? '')
  const [fadenOpen, setFadenOpen] = useState(false)
  const [openPointDraft, setOpenPointDraft] = useState('')
  const [addingOpenPoint, setAddingOpenPoint] = useState(false)
  const [editingPointId, setEditingPointId] = useState<string | null>(null)
  const [editPointDraft, setEditPointDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [pickingFor, setPickingFor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const openPointRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Genre-aware framing — same machinery, fiction-tuned labels.
  const isFiction = book.genre === 'fiction'
  const kindLabel = isFiction ? 'Roman' : 'Buch'
  const backHref = isFiction ? '/fiction' : '/projects'
  const kernLabel = isFiction ? 'Prämisse' : 'Kernthese'
  const kernPlaceholder = isFiction
    ? 'Worum geht es — in einem Satz?'
    : 'Wofür steht dieses Buch — in einem Satz?'
  const audienceLabel = isFiction ? 'Ton & Genre' : 'Zielleser'
  const audiencePlaceholder = isFiction
    ? 'Wie soll es sich anfühlen? Genre, Stimmung.'
    : 'Wer soll das lesen — in einem Satz?'

  // Debounced auto-save for the two header free-text fields
  function useDebouncedSave(value: string, original: string | null, field: keyof Project) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
      if (value === (original ?? '')) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        const next = value.trim() || null
        await fetch(`/api/projects/${book.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: next }),
        })
        setBook((b) => ({ ...b, [field]: next } as Project))
      }, 800)
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])
  }
  useDebouncedSave(kernideeDraft, book.kernidee, 'kernidee')
  useDebouncedSave(zielleserDraft, book.zielleser ?? null, 'zielleser')

  // ── Open Points actions ───────────────────────────────────────
  async function addOpenPoint(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = openPointDraft.trim()
    if (!trimmed || addingOpenPoint) return
    setAddingOpenPoint(true)
    try {
      const res = await fetch(`/api/projects/${book.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, is_open_point: true }),
      })
      if (res.ok) {
        const { input } = await res.json()
        setOpenPoints((prev) => [input, ...prev])
        setOpenPointDraft('')
        openPointRef.current?.focus()
      }
    } finally {
      setAddingOpenPoint(false)
    }
  }

  function startEditPoint(p: InputRow) {
    setEditingPointId(p.id)
    setEditPointDraft(p.content)
  }

  async function saveEditPoint() {
    if (!editingPointId) return
    const trimmed = editPointDraft.trim()
    const original = openPoints.find((p) => p.id === editingPointId)
    setEditingPointId(null)
    if (!original) return
    // Empty edit deletes the row (matches Outline behaviour)
    if (!trimmed) {
      setOpenPoints((prev) => prev.filter((p) => p.id !== original.id))
      await fetch(`/api/inputs/${original.id}`, { method: 'DELETE' })
      return
    }
    if (trimmed === original.content) return
    setOpenPoints((prev) => prev.map((p) => p.id === original.id ? { ...p, content: trimmed } : p))
    await fetch(`/api/inputs/${original.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    })
  }

  async function deleteOpenPoint(id: string) {
    setOpenPoints((prev) => prev.filter((p) => p.id !== id))
    await fetch(`/api/inputs/${id}`, { method: 'DELETE' })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const total = chapters.length
  const doneCount = chapters.filter((c) => chapterState(c) === 'done').length
  const inProgressCount = chapters.filter((c) => chapterState(c) === 'in_progress').length
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
          genre: book.genre ?? 'nonfiction', // chapters inherit the novel's genre
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        alert(`Kapitel anlegen fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }
      // Don't navigate away — append to list so user keeps planning context
      setChapters((prev) => [...prev, data.project])
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    const what = isFiction ? 'Roman' : 'Buch'
    if (!window.confirm(`${what} löschen? Alle Kapitel werden mit gelöscht. Das kann nicht rückgängig gemacht werden.`)) return
    const res = await fetch(`/api/projects/${book.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Löschen fehlgeschlagen: ${data.error ?? res.status}`)
      return
    }
    router.push(backHref)
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

  // ── Book Dump actions ─────────────────────────────────────────
  async function addBookNote(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = noteDraft.trim()
    if (!trimmed || submittingNote) return
    setSubmittingNote(true)
    try {
      const res = await fetch(`/api/projects/${book.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, is_section: false }),
      })
      if (res.ok) {
        const { input } = await res.json()
        setBookNotes((prev) => [input, ...prev])
        setNoteDraft('')
        noteRef.current?.focus()
      }
    } finally {
      setSubmittingNote(false)
    }
  }

  async function deleteNote(id: string) {
    setBookNotes((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/inputs/${id}`, { method: 'DELETE' })
  }

  async function assignNote(noteId: string, chapterId: string) {
    setPickingFor(null)
    setBookNotes((prev) => prev.filter((n) => n.id !== noteId))
    await fetch(`/api/inputs/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: chapterId }),
    })
  }

  function handleFunctionSavedLocal(id: string, fn: string | null) {
    setChapters((prev) => prev.map((c) => c.id === id ? { ...c, chapter_function: fn } : c))
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-garden-bg/92 backdrop-blur-md border-b border-garden-hairline pt-safe">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <Link
            href={backHref}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-hairline-soft text-garden-muted hover:text-garden-ink transition-colors"
            title={isFiction ? 'Zurück zu Romanen' : 'Zurück zu Projekten'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-mono micro-caps text-garden-accent">{kindLabel}</span>
              {total > 0 && (
                <>
                  <span className="text-[10px] text-garden-muted-soft">·</span>
                  <span className="font-mono micro-caps text-garden-muted-soft tabnums">
                    {doneCount}/{total} fertig{inProgressCount > 0 ? ` · ${inProgressCount} in Arbeit` : ''}
                  </span>
                </>
              )}
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
                className="w-full bg-transparent font-display text-xl md:text-2xl text-garden-ink outline-none border-b border-garden-accent"
                placeholder={isFiction ? 'Romantitel hinzufügen…' : 'Buchtitel hinzufügen…'}
                autoFocus
                style={{ fontWeight: 500 }}
              />
            ) : (
              <button
                onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10) }}
                className="font-display text-xl md:text-2xl text-garden-ink hover:text-garden-accent transition-colors truncate block max-w-full text-left"
                style={{ fontWeight: 500 }}
              >
                {book.title || 'Unbenanntes Buch'}
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-garden-muted/70 hover:text-garden-ink hover:bg-garden-hairline-soft transition-colors"
              title="Weitere Aktionen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-1 z-30 bg-garden-surface border border-garden-hairline rounded-xl shadow-paper-lg overflow-hidden min-w-56 animate-fade-in">
                  <button
                    onClick={() => { setMenuOpen(false); handleMarkDone() }}
                    disabled={completing || book.status === 'done'}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-accent hover:bg-garden-accent-soft transition-colors text-left disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {kindLabel} abschließen & exportieren
                  </button>
                  <div className="h-px bg-garden-hairline" />
                  <button
                    onClick={() => { setMenuOpen(false); handleDelete() }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-muted hover:bg-garden-hairline-soft hover:text-garden-accent transition-colors text-left"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                    {kindLabel} löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Section 1: Book header (Kernthese, Zielleser) ── */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-2">
        <div className="space-y-5">
          <div>
            <label className="font-mono micro-caps text-garden-accent block mb-1">{kernLabel}</label>
            <textarea
              value={kernideeDraft}
              onChange={(e) => setKernideeDraft(e.target.value)}
              placeholder={kernPlaceholder}
              rows={1}
              className="w-full bg-transparent font-serif text-garden-ink outline-none placeholder:text-garden-muted-soft/70 resize-none leading-relaxed"
              style={{ fontSize: 17, fontStyle: kernideeDraft ? 'normal' : 'italic' }}
            />
          </div>
          <div>
            <label className="font-mono micro-caps text-garden-muted-soft block mb-1">{audienceLabel}</label>
            <textarea
              value={zielleserDraft}
              onChange={(e) => setZielleserDraft(e.target.value)}
              placeholder={audiencePlaceholder}
              rows={1}
              className="w-full bg-transparent font-serif text-garden-ink outline-none placeholder:text-garden-muted-soft/70 resize-none leading-relaxed"
              style={{ fontSize: 15, fontStyle: zielleserDraft ? 'normal' : 'italic' }}
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Chapter structure ── */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pt-6 mt-2 border-t border-garden-hairline">
        <div className="flex items-center gap-3 pt-5 mb-2">
          <span className="font-mono micro-caps text-garden-accent">Kapitel</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          <button
            onClick={addChapter}
            disabled={creating}
            className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {creating ? '…' : 'Kapitel'}
          </button>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-display italic text-garden-muted mb-2">Noch keine Kapitel.</p>
            <button
              onClick={addChapter}
              disabled={creating}
              className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
            >
              Erstes Kapitel anlegen →
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
              <div className="divide-y divide-garden-hairline-soft">
                {chapters.map((chapter, i) => (
                  <SortableChapter
                    key={chapter.id}
                    chapter={chapter}
                    index={i}
                    onFunctionSaved={handleFunctionSavedLocal}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ── Section 3: Book Dump ── */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pt-6 mt-6 border-t border-garden-hairline">
        <div className="flex items-center gap-3 pt-5 mb-3">
          <span className="font-mono micro-caps text-garden-accent">Book Dump</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          <span className="font-mono micro-caps text-garden-muted-soft">
            {bookNotes.length === 0 ? 'leer' : bookNotes.length === 1 ? '1 Notiz' : `${bookNotes.length} Notizen`}
          </span>
        </div>
        <p className="font-display italic text-garden-muted text-[13px] mb-3 leading-relaxed">
          Gedanken zum Buch — ohne Druck, einem Kapitel zugeordnet zu werden.
        </p>

        <form onSubmit={addBookNote} className="relative pb-4 mb-4" style={{ borderBottom: '1px solid #E8E3D8' }}>
          <textarea
            ref={noteRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addBookNote() }
            }}
            placeholder="Eine Notiz fürs Buch — Stelle noch unklar."
            rows={2}
            disabled={submittingNote}
            className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted/70 font-display pretty"
            style={{ fontSize: 16, lineHeight: 1.5, fontWeight: 400 }}
          />
          <div className="flex items-center justify-end gap-3 mt-2">
            <span className="font-mono text-[10px] text-garden-muted-soft hidden sm:inline">⌘↵ speichern</span>
            <button
              type="submit"
              disabled={!noteDraft.trim() || submittingNote}
              title="Speichern"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-deep transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </form>

        <div className="space-y-0">
          {bookNotes.map((note, i) => (
            <div
              key={note.id}
              className="group py-3 flex items-start gap-3 animate-fade-in"
              style={{ borderTop: i === 0 ? 'none' : '1px solid #F0EBE0' }}
            >
              <p
                className="flex-1 min-w-0 font-display pretty text-garden-ink whitespace-pre-wrap"
                style={{ fontSize: 15, lineHeight: 1.55 }}
              >
                {note.content}
              </p>
              <div className="flex-shrink-0 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setPickingFor(note.id)}
                  className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
                  title="Notiz einem Kapitel zuordnen"
                >
                  → Kapitel
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="font-mono micro-caps text-garden-muted hover:text-garden-accent transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Offene Punkte edge tab ── */}
      <button
        onClick={() => setFadenOpen(true)}
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 items-center gap-1 py-3 px-2 bg-garden-surface border-y border-l border-garden-hairline rounded-l-lg text-garden-accent hover:text-garden-accent-deep hover:bg-garden-accent-soft transition-colors shadow-paper"
        title="Offene Punkte öffnen"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="font-mono micro-caps" style={{ writingMode: 'vertical-rl' }}>Offene Punkte</span>
      </button>

      {/* Mobile: small floating button in the corner */}
      <button
        onClick={() => setFadenOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 px-3 py-2 rounded-full bg-garden-surface border border-garden-hairline shadow-paper-lg text-garden-accent flex items-center gap-1.5"
        title="Offene Punkte"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-garden-accent" />
        <span className="font-mono micro-caps">Offen</span>
      </button>

      <OffenePunkte
        open={fadenOpen}
        points={openPoints}
        draft={openPointDraft}
        setDraft={setOpenPointDraft}
        draftRef={openPointRef}
        adding={addingOpenPoint}
        onAdd={addOpenPoint}
        editingId={editingPointId}
        editDraft={editPointDraft}
        setEditDraft={setEditPointDraft}
        onStartEdit={startEditPoint}
        onSaveEdit={saveEditPoint}
        onCancelEdit={() => setEditingPointId(null)}
        onDelete={deleteOpenPoint}
        onClose={() => setFadenOpen(false)}
      />

      {/* Chapter picker for assigning a book note */}
      {pickingFor && (
        <ChapterPicker
          chapters={chapters}
          onPick={(chapterId) => assignNote(pickingFor, chapterId)}
          onClose={() => setPickingFor(null)}
        />
      )}

      <NavBar />
    </div>
  )
}
