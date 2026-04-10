'use client'

import Link from 'next/link'
import type { Idea } from '@/lib/types'

interface Props {
  idea: Idea
  inputCount?: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function IdeaCard({ idea, inputCount = 0 }: Props) {
  const title = idea.title || idea.synthesis?.slice(0, 60) || 'Untitled idea'
  const snippet = idea.synthesis
    ? idea.synthesis.slice(0, 120) + (idea.synthesis.length > 120 ? '…' : '')
    : null

  return (
    <Link href={`/garden/${idea.id}`} className="block">
      <div className="bg-garden-surface rounded-2xl border border-garden-border hover:border-garden-muted/40 transition-all p-4 h-full animate-fade-in">
        {/* Title */}
        <h3 className="text-sm font-semibold text-garden-text leading-snug mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Synthesis snippet */}
        {snippet && (
          <p className="text-xs text-garden-muted leading-relaxed line-clamp-3 mb-3">
            {snippet}
          </p>
        )}

        {!snippet && (
          <p className="text-xs text-garden-muted/50 italic mb-3">No synthesis yet</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-garden-border/50">
          <span className="text-[10px] text-garden-muted">{formatDate(idea.created_at)}</span>
          <span className="text-[10px] text-garden-muted">
            {inputCount} {inputCount === 1 ? 'note' : 'notes'}
          </span>
        </div>
      </div>
    </Link>
  )
}
