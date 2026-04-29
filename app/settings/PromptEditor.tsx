'use client'

import { useEffect, useState } from 'react'

type RoleKey = 'sparring' | 'researcher' | 'editor'

const ROLE_LABEL: Record<RoleKey, string> = {
  sparring: 'Sparring',
  researcher: 'Recherche',
  editor: 'Lektor',
}

const ROLE_HINT: Record<RoleKey, string> = {
  sparring: 'Stellt Fragen, deckt Spannungen auf, treibt das Denken voran.',
  researcher: 'Erklärt Konzepte, zeigt Lücken, benennt verwandte Theorien.',
  editor: 'Schärft Texte, markiert Wiederholungen, schlägt Kürzungen vor.',
}

interface PromptsResponse {
  overrides: { sparring: string | null; researcher: string | null; editor: string | null }
  defaults: { sparring: string; researcher: string; editor: string }
}

export default function PromptEditor() {
  const [data, setData] = useState<PromptsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<RoleKey, string>>({
    sparring: '',
    researcher: '',
    editor: '',
  })
  const [saving, setSaving] = useState<RoleKey | null>(null)
  const [saved, setSaved] = useState<RoleKey | null>(null)

  useEffect(() => {
    fetch('/api/settings/prompts')
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((d: PromptsResponse) => {
        setData(d)
        setDrafts({
          sparring: d.overrides.sparring ?? d.defaults.sparring,
          researcher: d.overrides.researcher ?? d.defaults.researcher,
          editor: d.overrides.editor ?? d.defaults.editor,
        })
      })
      .catch((e) => setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : 'Fehler')))
  }, [])

  async function save(role: RoleKey) {
    if (!data || saving) return
    const text = drafts[role].trim()
    const isUnchanged = text === data.defaults[role]
    setSaving(role)
    setError(null)
    try {
      const res = await fetch('/api/settings/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // If user saved exactly the default text, treat as 'reset to default' (null)
        body: JSON.stringify({ [role]: isUnchanged ? null : text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
      setData((prev) => prev && {
        ...prev,
        overrides: { ...prev.overrides, [role]: isUnchanged ? null : text },
      })
      setSaved(role)
      setTimeout(() => setSaved(null), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  async function reset(role: RoleKey) {
    if (!data || saving) return
    setSaving(role)
    setError(null)
    try {
      const res = await fetch('/api/settings/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [role]: null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
      setData((prev) => prev && {
        ...prev,
        overrides: { ...prev.overrides, [role]: null },
      })
      setDrafts((prev) => ({ ...prev, [role]: data.defaults[role] }))
      setSaved(role)
      setTimeout(() => setSaved(null), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  if (!data) {
    return (
      <p className="font-mono micro-caps text-garden-muted-soft">
        {error ? `Fehler: ${error}` : 'Lade Prompts…'}
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-sm text-garden-danger bg-garden-danger-light rounded-lg px-3 py-2">{error}</p>
      )}

      {(Object.keys(ROLE_LABEL) as RoleKey[]).map((role) => {
        const isOverridden = data.overrides[role] !== null && data.overrides[role] !== undefined
        const isDirty = drafts[role] !== (data.overrides[role] ?? data.defaults[role])
        const isSaving = saving === role
        const justSaved = saved === role

        return (
          <div key={role} className="rounded-xl border border-garden-hairline bg-garden-surface p-4 md:p-5">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="font-display text-garden-ink" style={{ fontSize: 18, fontWeight: 500, fontStyle: 'italic' }}>
                {ROLE_LABEL[role]}
              </h3>
              <span className={`font-mono micro-caps ${isOverridden ? 'text-garden-accent' : 'text-garden-muted-soft'}`}>
                {isOverridden ? 'eigene Version' : 'Default'}
              </span>
            </div>
            <p className="font-serif italic text-[13px] text-garden-muted leading-relaxed mb-3">
              {ROLE_HINT[role]}
            </p>

            <textarea
              value={drafts[role]}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [role]: e.target.value }))}
              className="w-full bg-garden-bg/60 border border-garden-hairline rounded-lg px-3 py-2.5 text-[13px] text-garden-ink leading-relaxed font-mono resize-y outline-none focus:ring-2 focus:ring-garden-accent/20 focus:border-garden-accent/40"
              rows={Math.min(20, Math.max(8, drafts[role].split('\n').length + 1))}
            />

            <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => save(role)}
                  disabled={isSaving || !isDirty}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${
                    justSaved
                      ? 'bg-garden-accent-soft text-garden-accent-deep'
                      : 'bg-garden-accent text-white hover:bg-garden-accent-deep'
                  }`}
                >
                  {isSaving ? 'Speichere…' : justSaved ? 'Gespeichert' : 'Speichern'}
                </button>

                {isOverridden && (
                  <button
                    onClick={() => reset(role)}
                    disabled={isSaving}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-danger transition-colors disabled:opacity-40"
                  >
                    Auf Default zurücksetzen
                  </button>
                )}
              </div>
              <span className="font-mono text-[10px] text-garden-muted-soft">
                {drafts[role].length} Zeichen
              </span>
            </div>
          </div>
        )
      })}

      <p className="font-mono text-[11px] text-garden-muted-soft leading-relaxed">
        Hinweis: Der App-spezifische Kontext-Header (Idea Garden, Werk-Titel) und das Material-Block
        (Kernidee, Outline, Notes, ggf. Text bei Lektor) werden automatisch davorgesetzt.
        Schreibe hier nur die Verhaltens-Anweisungen für die Rolle.
      </p>
    </div>
  )
}
