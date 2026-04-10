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

  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return 'yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const TYPE_ICON: Record<string, string> = {
  text:  '',
  voice: '🎙',
  image: '📷',
  quote: '"',
}

export default function NodeCard({ node, selected, onSelect, onDelete, onPromote, selectionMode }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const preview = node.content ? node.content.slice(0, 160) : ''
  const isLong = (node.content?.length ?? 0) > 160

  function handleTap() {
    if (selectionMode) {
      onSelect?.()
      return
    }
    if (node.content_type === 'image') {
      setExpanded((v) => !v)
    } else {
      setShowActions((v) => !v)
    }
  }

  return (
    <div
      onClick={handleTap}
      className={`relative bg-garden-surface rounded-2xl border transition-all cursor-pointer animate-fade-in ${
        selected
          ? 'border-garden-accent ring-2 ring-garden-accent/20'
          : 'border-garden-border hover:border-garden-muted/40'
      }`}
    >
      {/* Selection indicator */}
      {selectionMode && (
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'bg-garden-accent border-garden-accent' : 'border-garden-muted/50 bg-white'
        }`}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Type badge */}
        {TYPE_ICON[node.content_type] && (
          <span className="text-xs text-garden-muted mr-1">{TYPE_ICON[node.content_type]}</span>
        )}

        {/* Image node */}
        {node.content_type === 'image' && node.image_url && (
          <div className={`mb-3 rounded-xl overflow-hidden bg-garden-bg transition-all ${expanded ? '' : 'max-h-32'}`}>
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

        {/* Text content */}
        {node.content && (
          <p className="text-garden-text text-sm leading-relaxed whitespace-pre-wrap break-words">
            {expanded || !isLong ? node.content : preview + '…'}
          </p>
        )}

        {/* Show more toggle */}
        {isLong && !selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="mt-1 text-xs text-garden-accent"
          >
            {expanded ? 'less' : 'more'}
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-garden-muted">{formatDate(node.created_at)}</span>
          {node.promoted && (
            <span className="text-[10px] text-garden-accent bg-garden-accent-light px-2 py-0.5 rounded-full">
              in garden
            </span>
          )}
        </div>
      </div>

      {/* Action tray — slides in on tap */}
      {showActions && !selectionMode && (
        <div
          className="border-t border-garden-border flex"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onPromote?.(); setShowActions(false) }}
            disabled={node.promoted}
            className="flex-1 py-3 text-xs font-medium text-garden-accent hover:bg-garden-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-bl-2xl"
          >
            {node.promoted ? 'Already in garden' : 'Move to garden'}
          </button>
          <div className="w-px bg-garden-border" />
          <button
            onClick={() => { onDelete?.(); setShowActions(false) }}
            className="flex-1 py-3 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors rounded-br-2xl"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
