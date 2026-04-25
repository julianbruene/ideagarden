'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import type { IdeaNode } from '@/lib/types'

interface Props {
  node: IdeaNode
  selected?: boolean
  onSelect?: () => void
  onDelete?: () => void
  onPromote?: () => void
  onNodeUpdated?: (node: IdeaNode) => void
  selectionMode?: boolean
  hearted?: boolean
  onHeart?: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
  if (diffH < 1) return 'gerade eben'
  if (diffH < 24) return `vor ${Math.floor(diffH)}h`
  if (diffH < 48) return 'gestern'
  return d.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

export default function NodeCard({ node, selected, onSelect, onDelete, onPromote, onNodeUpdated, selectionMode, hearted, onHeart }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState(false)
  const [editingField, setEditingField] = useState<null | 'content' | 'transcript'>(null)
  const [editDraft, setEditDraft] = useState('')
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingField && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editDraft.length, editDraft.length)
    }
  }, [editingField, editDraft.length])

  function startEdit(field: 'content' | 'transcript') {
    setEditingField(field)
    setEditDraft(field === 'content' ? (node.content ?? '') : (node.image_transcript ?? ''))
  }
  function cancelEdit() {
    setEditingField(null)
    setEditDraft('')
  }
  async function saveEdit() {
    const field = editingField
    if (!field) return
    const current = field === 'content' ? (node.content ?? '') : (node.image_transcript ?? '')
    if (editDraft === current) { cancelEdit(); return }
    const payload = field === 'content' ? { content: editDraft } : { image_transcript: editDraft || null }
    onNodeUpdated?.({
      ...node,
      ...(field === 'content' ? { content: editDraft } : { image_transcript: editDraft || null }),
    })
    setEditingField(null)
    setEditDraft('')
    const res = await fetch(`/api/nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const { node: updated } = await res.json()
      if (updated) onNodeUpdated?.(updated)
    }
  }
  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit() }
  }

  function runTranscribe() {
    setTranscribing(true)
    setTranscribeError(false)
    fetch(`/api/nodes/${node.id}/transcribe`, { method: 'POST' })
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json?.error ?? `HTTP ${r.status}`)
        return json
      })
      .then((data) => { if (data?.node) onNodeUpdated?.(data.node) })
      .catch((e) => { console.error('Transcribe failed:', e.message); setTranscribeError(true) })
      .finally(() => setTranscribing(false))
  }

  const preview = node.content ? node.content.slice(0, 200) : ''
  const isLong = (node.content?.length ?? 0) > 200

  async function handlePromote(e: React.MouseEvent) {
    e.stopPropagation()
    if (promoting || node.promoted) return
    setPromoting(true)
    await onPromote?.()
    setPromoting(false)
  }

  function handleCardClick() {
    if (selectionMode) {
      onSelect?.()
      return
    }
    if (isLong || node.content_type === 'image') {
      setExpanded((v) => !v)
    }
  }

  const isQuote = node.content_type === 'quote'

  return (
    <div
      onClick={handleCardClick}
      className={`relative rounded-2xl bg-garden-surface transition-all animate-fade-in overflow-hidden ${
        selected ? 'ring-2 ring-garden-accent/30 border-garden-accent' : ''
      } ${selectionMode ? 'cursor-pointer' : ''}`}
      style={{
        border: `1px solid ${hearted ? 'rgba(230,115,78,0.35)' : '#E8E3D8'}`,
      }}
    >
      {/* hearted: coral stripe left */}
      {hearted && !selectionMode && (
        <span className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-garden-accent" />
      )}

      {/* Selection circle */}
      {selectionMode && (
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'bg-garden-accent border-garden-accent' : 'border-garden-muted-soft bg-white'
        }`}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      <div className="px-4 pt-4 pb-3">
        {/* meta row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono micro-caps text-garden-muted-soft">{formatDate(node.created_at)}</span>
          {node.content_type !== 'text' && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-garden-hairline-soft text-garden-muted">
              {node.content_type}
            </span>
          )}
        </div>

        {/* Image */}
        {node.content_type === 'image' && node.image_url && (
          <div className="mb-2">
            <div className={`rounded-xl overflow-hidden bg-garden-bg ${expanded ? '' : 'max-h-40'}`}>
              <Image
                src={node.image_url}
                alt="Node image"
                width={400}
                height={300}
                className="w-full object-cover"
                unoptimized
              />
            </div>
            {/* Transcript */}
            {editingField === 'transcript' ? (
              <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                <textarea
                  ref={editRef}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-white border border-garden-accent/40 rounded-lg px-2 py-1.5 text-[13px] text-garden-muted leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/20"
                  rows={3}
                />
                <p className="font-mono text-[10px] text-garden-muted-soft mt-1">Cmd+Enter speichern · Esc abbrechen</p>
              </div>
            ) : node.image_transcript ? (
              <p
                className="mt-1.5 text-[13px] text-garden-muted leading-relaxed whitespace-pre-wrap break-words cursor-text hover:text-garden-ink transition-colors"
                onClick={(e) => { e.stopPropagation(); startEdit('transcript') }}
                title="Klick zum Bearbeiten"
              >
                {node.image_transcript}
              </p>
            ) : transcribing ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border-2 border-garden-muted-soft border-t-transparent rounded-full animate-spin block flex-shrink-0" />
                <p className="font-mono text-[11px] text-garden-muted-soft italic">Text wird extrahiert…</p>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); runTranscribe() }}
                  className={`font-mono text-[11px] flex items-center gap-1 transition-colors ${
                    transcribeError
                      ? 'text-garden-danger hover:text-garden-danger/80'
                      : 'text-garden-muted-soft hover:text-garden-accent'
                  }`}
                >
                  {transcribeError ? 'Fehlgeschlagen — nochmal' : 'Text extrahieren'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text — editable */}
        {editingField === 'content' ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={editRef}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-white border border-garden-accent/40 rounded-lg px-2.5 py-1.5 text-[15.5px] text-garden-ink leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/20"
              rows={Math.max(3, Math.min(12, editDraft.split('\n').length + 1))}
            />
            <p className="font-mono text-[10px] text-garden-muted-soft mt-1">Cmd+Enter speichern · Esc abbrechen</p>
          </div>
        ) : node.content ? (
          <p
            className={`leading-relaxed whitespace-pre-wrap break-words cursor-text hover:bg-garden-hairline-soft/40 -mx-1 px-1 rounded transition-colors ${
              isQuote ? 'font-display italic' : ''
            } text-garden-ink`}
            onClick={(e) => {
              if (selectionMode) return
              e.stopPropagation()
              if (isLong && !expanded) setExpanded(true)
              else startEdit('content')
            }}
            style={{ fontSize: 15.5, lineHeight: 1.55 }}
            title={selectionMode ? undefined : (isLong && !expanded ? 'Klick zum Ausklappen' : 'Klick zum Bearbeiten')}
          >
            {expanded || !isLong ? node.content : preview + '…'}
          </p>
        ) : null}

        {isLong && expanded && !selectionMode && editingField !== 'content' && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
            className="mt-1 font-mono text-[11px] text-garden-accent"
          >
            weniger
          </button>
        )}
      </div>

      {/* Persistent action bar — 4 segments: Sex / In Garden / Edit / Trash */}
      {!selectionMode && (
        <div className="flex items-stretch border-t border-garden-hairline-soft">
          {/* Sex (heart) */}
          <button
            onClick={(e) => { e.stopPropagation(); onHeart?.() }}
            title={hearted ? 'Für Idea Sex vorgemerkt' : 'Für Idea Sex vormerken'}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 transition-colors ${
              hearted
                ? 'text-garden-accent bg-garden-accent-soft'
                : 'text-garden-muted hover:text-garden-accent hover:bg-garden-accent-soft'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24"
              fill={hearted ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="font-mono micro-caps">Sex</span>
          </button>

          <div className="w-px bg-garden-hairline-soft" />

          {/* In Garden */}
          <button
            onClick={handlePromote}
            disabled={node.promoted || promoting}
            title="In Garden pflanzen"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-garden-accent-deep hover:bg-garden-accent-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {promoting ? (
              <span className="w-3 h-3 border-2 border-garden-accent-deep border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22V12" />
                <path d="M12 12C12 8 8 4 4 4c0 4 2.5 7.5 8 8z" />
                <path d="M12 12c0-4 4-8 8-8 0 4-2.5 7.5-8 8z" />
                <path d="M5 22h14" />
              </svg>
            )}
            <span className="font-mono micro-caps">{node.promoted ? 'Im Garden' : 'In Garden'}</span>
          </button>

          <div className="w-px bg-garden-hairline-soft" />

          {/* Edit */}
          <button
            onClick={(e) => { e.stopPropagation(); startEdit('content') }}
            title="Überarbeiten"
            className="flex items-center justify-center px-3.5 py-2.5 text-garden-muted hover:text-garden-ink hover:bg-garden-hairline-soft transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>

          <div className="w-px bg-garden-hairline-soft" />

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
            title="Löschen"
            className="flex items-center justify-center px-3.5 py-2.5 text-garden-muted hover:text-garden-danger hover:bg-garden-danger-light transition-colors rounded-br-2xl"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/>
              <path d="M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14"/>
              <path d="M12 10v8"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
