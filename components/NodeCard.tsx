'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { IdeaNode } from '@/lib/types'

interface Props {
  node: IdeaNode
  selected?: boolean
  onSelect?: () => void
  onDelete?: () => void
  onPromote?: () => void
  selectionMode?: boolean
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 1) return 'gerade eben'
  if (diffH < 24) return `vor ${Math.floor(diffH)}h`
  if (diffH < 48) return 'gestern'
  return d.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

const TYPE_ICON: Record<string, string> = {
  voice: '🎙 ',
  image: '',
  quote: '"',
  text: '',
}

export default function NodeCard({ node, selected, onSelect, onDelete, onPromote, selectionMode }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [promoting, setPromoting] = useState(false)

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

  return (
    <div
      onClick={handleCardClick}
      className={`relative bg-garden-surface rounded-2xl border transition-all animate-fade-in ${
        selected
          ? 'border-garden-accent ring-2 ring-garden-accent/20'
          : 'border-garden-border'
      } ${selectionMode ? 'cursor-pointer' : ''}`}
    >
      {/* Selection circle */}
      {selectionMode && (
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'bg-garden-accent border-garden-accent' : 'border-garden-muted/40 bg-white'
        }`}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      <div className="p-4 pb-3">
        {/* Type prefix */}
        {TYPE_ICON[node.content_type] && (
          <span className="text-xs text-garden-muted">{TYPE_ICON[node.content_type]}</span>
        )}

        {/* Image */}
        {node.content_type === 'image' && node.image_url && (
          <div className={`mb-3 rounded-xl overflow-hidden bg-garden-bg ${expanded ? '' : 'max-h-40'}`}>
            <Image
              src={node.image_url}
              alt="Node image"
              width={400}
              height={300}
              className="w-full object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Text */}
        {node.content && (
          <p className="text-sm text-garden-text leading-relaxed whitespace-pre-wrap break-words">
            {expanded || !isLong ? node.content : preview + '…'}
          </p>
        )}

        {isLong && !selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="mt-1 text-xs text-garden-accent"
          >
            {expanded ? 'weniger' : 'mehr'}
          </button>
        )}

        {/* Date + promoted badge */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-garden-muted">{formatDate(node.created_at)}</span>
          {node.promoted && (
            <span className="text-[10px] text-garden-accent bg-garden-accent-light px-2 py-0.5 rounded-full">
              im Garden
            </span>
          )}
        </div>
      </div>

      {/* Action bar — always visible, not hidden behind tap */}
      {!selectionMode && (
        <div className="flex border-t border-garden-border/60">
          <button
            onClick={handlePromote}
            disabled={node.promoted || promoting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-garden-accent hover:bg-garden-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-bl-2xl"
          >
            {promoting ? (
              <span className="w-3 h-3 border-2 border-garden-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22V12" />
                <path d="M12 12C12 8 8 4 4 4c0 4 2.5 7.5 8 8z" />
                <path d="M12 12c0-4 4-8 8-8 0 4-2.5 7.5-8 8z" />
                <path d="M5 22h14" />
              </svg>
            )}
            {node.promoted ? 'Im Garden' : 'In Garden'}
          </button>

          <div className="w-px bg-garden-border/60" />

          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
            className="px-4 py-2.5 text-garden-muted hover:text-red-500 hover:bg-red-50 transition-colors rounded-br-2xl"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
