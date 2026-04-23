'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProjectButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (loading) return
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (data.project?.id) {
      router.push(`/projects/${data.project.id}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-xl bg-garden-accent text-white font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-50"
    >
      {loading ? '…' : '+ New project'}
    </button>
  )
}
