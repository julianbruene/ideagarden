'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { createClient } from '@/lib/supabase/client'
import MirrorPicker from './MirrorPicker'
import type { Input } from '@/lib/types'

interface Props {
  projectId: string
  notes: Input[]
  onNoteAdded: (note: Input) => void
  onNoteRemoved: (id: string) => void
  onNoteUpdated: (note: Input) => void
  onNotesReordered: (notes: Input[]) => void
}

function isImageNote(content: string) { return content.startsWith('[img]') }
function getImageUrl(content: string) { return content.slice(5) }

// Sort notes by outline_order, falling back to created_at for un-ordered ones
function sortByOutline(a: Input, b: Input) {
  const ao = a.outline_order ?? Number.MAX_SAFE_INTEGER
  const bo = b.outline_order ?? Number.MAX_SAFE_INTEGER
  if (ao !== bo) return ao - bo
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

interface SortableNoteProps {
  note: Input
  onEdit: (id: string, field: 'content' | 'transcript') => void
  onDelete: (id: string) => void
  onMirror: (id: string) => void
  onToggleUsed: (note: Input) => void
  onToggleStar: (note: Input) => void
  isEditing: boolean
  editingField: 'content' | 'transcript'
  editDraft: string
  setEditDraft: (s: string) => void
  saveEdit: () => void
  cancelEdit: () => void
  editRef: React.RefObject<HTMLTextAreaElement | null>
}

function SortableNote({
  note, onEdit, onDelete, onMirror, onToggleUsed, onToggleStar,
  isEditing, editingField, editDraft, setEditDraft, saveEdit, cancelEdit, editRef,
}: SortableNoteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isImg = isImageNote(note.content)
  const isMirror = !!note.mirror_source_id

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit() }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-garden-surface rounded-xl border overflow-hidden ${
        note.used
          ? 'border-garden-accent/40 bg-garden-accent-light/40'
          : 'border-garden-border/70'
      } ${isDragging ? 'shadow-paper-lg' : 'hover:border-garden-accent/30'} transition-all`}
    >
      <div className="flex items-start gap-1">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-2 text-garden-muted-soft hover:text-garden-text cursor-grab active:cursor-grabbing touch-none"
          title="Ziehen zum Sortieren"
          aria-label="Reihenfolge ändern"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
          </svg>
        </button>

        {/* Content area */}
        <div className="flex-1 min-w-0 py-2 pr-2">
          {isImg ? (
            <div>
              <Image
                src={getImageUrl(note.content)}
                alt="Note"
                width={400}
                height={300}
                className="w-full object-cover max-h-40 rounded-lg"
                unoptimized
              />
              {isEditing && editingField === 'transcript' ? (
                <div className="mt-1.5">
                  <textarea
                    ref={editRef}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleEditKeyDown}
                    className="w-full bg-white border border-garden-accent/40 rounded-lg px-2 py-1.5 text-xs text-garden-muted leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/20"
                    rows={3}
                  />
                </div>
              ) : note.image_transcript ? (
                <p
                  className="text-xs text-garden-muted leading-relaxed mt-1.5 cursor-text hover:text-garden-text transition-colors whitespace-pre-wrap break-words"
                  onClick={() => onEdit(note.id, 'transcript')}
                >
                  {note.image_transcript}
                </p>
              ) : (
                <button
                  onClick={() => onEdit(note.id, 'transcript')}
                  className="text-xs text-garden-muted-soft hover:text-garden-accent italic mt-1.5"
                >
                  + Text hinzufügen
                </button>
              )}
            </div>
          ) : isEditing && editingField === 'content' ? (
            <textarea
              ref={editRef}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-white border border-garden-accent/40 rounded-lg px-2.5 py-1.5 text-sm text-garden-text leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/20"
              rows={Math.max(3, Math.min(12, editDraft.split('\n').length + 1))}
            />
          ) : (
            <p
              onClick={() => onEdit(note.id, 'content')}
              className="text-sm text-garden-text leading-relaxed whitespace-pre-wrap break-words cursor-text hover:bg-white/40 -mx-1 px-1 rounded transition-colors"
              title="Klick zum Bearbeiten"
            >
              {note.content}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {note.used && (
                <span className="text-[9px] uppercase tracking-widest text-garden-accent font-medium px-1.5 py-0.5 rounded-full bg-garden-accent-light">
                  Verwendet
                </span>
              )}
              {note.starred && (
                <span className="text-[9px] text-garden-star bg-garden-star-light px-1.5 py-0.5 rounded-full font-medium">
                  Key
                </span>
              )}
              {isMirror && (
                <span className="text-[9px] text-garden-accent bg-garden-accent-light px-1.5 py-0.5 rounded-full font-medium" title="Spiegel">
                  Spiegel
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onToggleUsed(note)}
                title={note.used ? 'Als unverwendet markieren' : 'Als verwendet markieren'}
                className={`p-1 rounded text-[10px] transition-colors ${
                  note.used ? 'text-garden-accent' : 'text-garden-muted-soft hover:text-garden-accent'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button
                onClick={() => onToggleStar(note)}
                title={note.starred ? 'Stern entfernen' : 'Als Key markieren'}
                className={`p-1 rounded transition-colors ${
                  note.starred ? 'text-garden-star' : 'text-garden-muted-soft hover:text-garden-star'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24"
                  fill={note.starred ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button
                onClick={() => onMirror(note.id)}
                title="Spiegeln"
                className="p-1 rounded text-garden-muted-soft hover:text-garden-accent transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              <button
                onClick={() => onDelete(note.id)}
                title="Löschen"
                className="p-1 rounded text-garden-muted-soft hover:text-garden-danger transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectOutline({
  projectId, notes, onNoteAdded, onNoteRemoved, onNoteUpdated, onNotesReordered,
}: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'content' | 'transcript'>('content')
  const [editDraft, setEditDraft] = useState('')

  const [mirrorNoteId, setMirrorNoteId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editDraft.length, editDraft.length)
    }
  }, [editingId, editDraft.length])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sorted = [...notes].filter((n) => n.role === 'user' && n.is_note !== false).sort(sortByOutline)

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sorted.findIndex((n) => n.id === active.id)
    const newIndex = sorted.findIndex((n) => n.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(sorted, oldIndex, newIndex)
    // Optimistic — apply new outline_order locally
    const updated = reordered.map((n, i) => ({ ...n, outline_order: i }))
    onNotesReordered(updated)

    // Persist
    await fetch(`/api/projects/${projectId}/reorder-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: reordered.map((n) => n.id) }),
    })
  }

  async function uploadImage(file: File): Promise<string | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('node-images').upload(path, file, { upsert: false })
    if (error) return null
    const { data } = supabase.storage.from('node-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveNote(content: string): Promise<Input | null> {
    const nextOrder = sorted.length
    const res = await fetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) return null
    const { input } = await res.json()
    if (!input) return null
    // Set outline_order on the new note
    await fetch(`/api/inputs/${input.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline_order: nextOrder }),
    })
    const withOrder = { ...input, outline_order: nextOrder }
    onNoteAdded(withOrder)
    return withOrder
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    await saveNote(trimmed)
    setText('')
    textareaRef.current?.focus()
    setSubmitting(false)
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const url = await uploadImage(file)
    if (url) {
      const note = await saveNote(`[img]${url}`)
      if (note) {
        // Run transcription in background
        fetch(`/api/inputs/${note.id}/transcribe`, { method: 'POST' })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.input) onNoteUpdated({ ...data.input, outline_order: note.outline_order }) })
          .catch(() => null)
      }
    }
    setUploading(false)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await handleImageFile(file)
    e.target.value = ''
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) await handleImageFile(blob)
        return
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleDelete(id: string) {
    onNoteRemoved(id)
    await fetch(`/api/inputs/${id}`, { method: 'DELETE' })
  }

  async function handleToggleStar(note: Input) {
    const next = !note.starred
    onNoteUpdated({ ...note, starred: next })
    await fetch(`/api/inputs/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: next }),
    })
  }

  async function handleToggleUsed(note: Input) {
    const next = !note.used
    onNoteUpdated({ ...note, used: next })
    await fetch(`/api/inputs/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ used: next }),
    })
  }

  function startEdit(id: string, field: 'content' | 'transcript') {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    setEditingId(id)
    setEditingField(field)
    setEditDraft(field === 'content' ? note.content : (note.image_transcript ?? ''))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  async function saveEdit() {
    const note = notes.find((n) => n.id === editingId)
    if (!note) return
    const current = editingField === 'content' ? note.content : (note.image_transcript ?? '')
    if (editDraft === current) { cancelEdit(); return }

    const optimistic: Input = editingField === 'content'
      ? { ...note, content: editDraft }
      : { ...note, image_transcript: editDraft || null }
    onNoteUpdated(optimistic)
    setEditingId(null)
    setEditDraft('')

    const payload = editingField === 'content'
      ? { content: editDraft }
      : { image_transcript: editDraft || null }

    const res = await fetch(`/api/inputs/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const { input } = await res.json()
      if (input) onNoteUpdated(input)
    }
  }

  const busy = submitting || uploading

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {sorted.length === 0 && (
          <p className="text-xs text-garden-muted-soft text-center py-8 italic">
            Noch keine Notes. Füge unten welche hinzu — sie werden automatisch hier sortiert.
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sorted.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sorted.map((note) => (
                <SortableNote
                  key={note.id}
                  note={note}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onMirror={(id) => setMirrorNoteId(id)}
                  onToggleUsed={handleToggleUsed}
                  onToggleStar={handleToggleStar}
                  isEditing={editingId === note.id}
                  editingField={editingField}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  saveEdit={saveEdit}
                  cancelEdit={cancelEdit}
                  editRef={editRef}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add-note input */}
      <div className="flex-shrink-0 border-t border-garden-border bg-garden-surface px-3 py-3">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        <form onSubmit={handleSubmit}>
          <div className="bg-garden-bg rounded-xl border border-garden-border focus-within:border-garden-accent/50 focus-within:ring-2 focus-within:ring-garden-accent/10 transition-all">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Note hinzufügen… ⏎ zum Speichern"
              disabled={busy}
              className="w-full px-3.5 pt-3 pb-2 bg-transparent resize-none outline-none text-garden-text placeholder:text-garden-muted-soft text-sm leading-relaxed disabled:opacity-50"
              rows={1}
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="p-1.5 rounded-lg text-garden-muted hover:text-garden-text hover:bg-garden-border/40 transition-colors disabled:opacity-40"
              >
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-garden-muted border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </button>
              <button
                type="submit"
                disabled={!text.trim() || busy}
                className="p-1.5 rounded-lg bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-dark transition-colors"
              >
                {submitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {mirrorNoteId && (
        <MirrorPicker
          noteId={mirrorNoteId}
          excludeProjectId={projectId}
          onClose={() => setMirrorNoteId(null)}
        />
      )}
    </div>
  )
}
