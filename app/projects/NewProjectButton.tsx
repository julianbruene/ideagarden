'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProjectButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        const msg = data?.error ?? `Fehler ${res.status}`
        console.error('[new project] failed:', msg, data)
        setError(msg)
        setLoading(false)
        return
      }
      router.push(`/projects/${data.project.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
      console.error('[new project] network error:', e)
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-xl bg-garden-accent text-white font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-50"
      >
        {loading ? '…' : '+ New project'}
      </button>
      {error && (
        <p className="text-[10px] text-red-500 max-w-[220px] text-right leading-tight">
          {error}
        </p>
      )}
    </div>
  )
}
