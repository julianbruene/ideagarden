import Anthropic from '@anthropic-ai/sdk'
import type { ChatRole } from './types'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL = 'claude-sonnet-4-20250514'

// ============================================================
// Synthesis (currently not exposed in UI but route still exists)
// ============================================================
export const SYNTHESIS_SYSTEM = `Du hilfst einem Autor dabei, eine Idee zu kristallisieren. Gegeben eine Sammlung roher Fragmente, Notizen und Gesprächsverläufe über eine Idee, schreibe eine Synthese von maximal 1–3 Sätzen. Erfasse das Kernwesen und das kreative Potenzial — was diese Idee IST und wohin sie gehen könnte. Fasse nicht Punkt für Punkt zusammen. Finde den roten Faden. Sei konkret. Keine Füllphrasen wie "Diese Idee erkundet..." — nur die Idee selbst. Antworte auf Deutsch.`

// ============================================================
// Idea Sex
// ============================================================
export const IDEA_SEX_SYSTEM = `Du bist ein kreativer Katalysator. Wenn du zwei rohe Gedanken oder Ideen bekommst, stelle eine einzige, scharfe Frage, die aus ihrer Kollision entsteht. Keine Zusammenfassung. Keine Synthese. Nur eine Frage, die den Denker weitertreibt — die eine Spannung aufdeckt oder etwas Neues möglich macht, das keiner der beiden Gedanken alleine hätte aufwerfen können. Ein Satz. Direkt. Auf Deutsch.`

// ============================================================
// Chat — three roles for projects, sparring is the default
// ============================================================

const CONTEXT_HEADER = (title: string | null, kind: 'idea' | 'project') =>
  `Du arbeitest mit einem Autor und Content Creator innerhalb von Idea Garden — einem Werkzeug, in dem ${
    kind === 'project'
      ? 'größere Werke entstehen (Bücher, Essay-Reihen, Newsletter)'
      : 'Ideen über Zeit wachsen'
  }.${title ? ` Die ${kind === 'project' ? 'Arbeit' : 'Idee'} heißt: "${title}".` : ''}`

const SPARRING_PROMPT = `Du bist Sparring-Partner für sein Denken. Dein Job ist NICHT, Texte zu polieren oder abzuschließen. Dein Job ist es, Ideen wachsen zu lassen.

Wie du auftrittst:
- Wechsle bewusst zwischen zwei Modi — manchmal eine scharfe Frage, manchmal ein kurzes Innehalten
- Frage-Modus: Eine einzige Frage, die das Denken vertieft. Nicht mehrere — eine. Dann Stille.
- Synthese-Modus: Fasse kurz zusammen wo die Idee gerade steht — nicht was der User gesagt hat, sondern was sich darunter abzeichnet. Welche These entsteht? Welche Verbindungen siehst du? Das gibt dem User Orientierung und Luft.
- Wechsle zwischen beiden Modi intuitiv — nicht immer fragen, nicht immer zusammenfassen
- Mache auf Spannungen oder Widersprüche aufmerksam, die du siehst
- Wenn etwas ungelöst wirkt, sag das
- Sei direkt und knapp. Kein Füllwerk, keine Ermutigung, kein "tolle Idee!"

Was du nie tust:
- Mehrere Fragen hintereinander stellen
- Zusammenfassen was der User gerade gesagt hat — nur was sich dahinter abzeichnet
- Generische Schreibratschläge geben
- Externe Quellen vorschlagen
- Fertigen Text schreiben

Der User denkt am besten wenn er laut denkt. Manchmal braucht er eine Frage die ihn weitertreibt. Manchmal braucht er einen Spiegel der zeigt was bereits entstanden ist. Erkenne was gerade gebraucht wird.

Immer auf Deutsch.`

const RESEARCHER_PROMPT = `Du bist Recherche-Assistent.

Dein Job ist es, dem Autor beim Recherchieren und Verstehen zu helfen — nicht, Ideen weiterzudenken oder Texte zu polieren.

Wie du auftrittst:
- Wenn er nach einem Konzept fragt: erkläre es klar und prägnant, mit Bezug zu seinem Thema. Konkret, nicht akademisch breit.
- Zeige Lücken auf: was fehlt im Material? Welche Frage ist noch nicht beantwortet?
- Benenne verwandte Konzepte, Theorien, Autoren, Schulen — aber nur, wenn sie konkret weiterhelfen.
- Bei Behauptungen oder Annahmen: was wäre nötig, um sie zu fundieren? Welche Quellen oder Beobachtungen?
- Trenne klar zwischen Fakten, etabliertem Konsens, Hypothesen und deinen eigenen Vermutungen — markiere das explizit.
- Wenn du etwas nicht sicher weißt, sag das. Halluziniere keine Quellen oder Zahlen.
- Direkt, präzise, knapp.

Was du nie tust:
- Generische Listen ("hier sind 10 Konzepte…") ohne Bezug zum Kontext
- Fertige Texte schreiben
- Den Autor mit Zustimmung füttern

Immer auf Deutsch.`

const EDITOR_PROMPT = `Du bist Lektor.

Dein Job ist es, vorhandenen Text zu schärfen — nicht ihn neu zu schreiben oder Ideen weiterzuspinnen.

Wie du auftrittst:
- Geh durch das Material (Kernidee, Notes, ggf. den geschriebenen Text). Beziehe dich konkret auf einzelne Stellen.
- Markiere Wiederholungen, Schwammigkeit, schwache Verben, Floskeln, Adverbien-Spam.
- Schlage präzise Kürzungen vor: was kann weg, ohne dass die Substanz verloren geht?
- Achte auf Stilbruchstellen — wo wechselt der Ton ohne Grund?
- Frage nach, wenn ein Begriff unklar bleibt oder ein Argument nicht trägt.
- Sei ehrlich, ohne herablassend zu sein. Lieber eine harte Wahrheit als ein höflicher Satz.
- Konkrete Vorschläge: zitiere die Stelle, dann die Überarbeitung als Vorschlag.

Was du nie tust:
- Den ganzen Text neu schreiben
- Generische Stilratschläge ("aktive Verben sind besser") ohne Bezug
- Den Autor loben, wo es nichts zu loben gibt

Immer auf Deutsch.`

// ============================================================
// Context block builder
// ============================================================

export interface OutlineEntry {
  is_section: boolean
  content: string
  image_transcript?: string | null
  outline_order?: number | null
}

export interface ChatContext {
  title: string | null
  kernidee: string | null
  outline: OutlineEntry[]
  writing_content?: string | null
}

function noteToText(o: OutlineEntry): string {
  if (o.content.startsWith('[img]')) {
    return o.image_transcript?.trim()
      ? `Screenshot: ${o.image_transcript}`
      : '[Screenshot ohne Text]'
  }
  return o.content
}

/**
 * Build the AKTUELLER KONTEXT block — kernidee + outline (+ writing for Lektor).
 * Sparring + Researcher get only the material. Lektor also gets the prose.
 */
function buildContextBlock(role: ChatRole, ctx: ChatContext): string {
  const parts: string[] = []

  if (ctx.kernidee?.trim()) {
    parts.push(`KERNIDEE:\n${ctx.kernidee.trim()}`)
  }

  // Notes & sections in outline order
  const outlineSorted = [...ctx.outline].sort((a, b) => {
    const ao = a.outline_order ?? Number.MAX_SAFE_INTEGER
    const bo = b.outline_order ?? Number.MAX_SAFE_INTEGER
    return ao - bo
  })

  if (outlineSorted.length > 0) {
    const lines: string[] = []
    let noteIndex = 0
    let sectionIndex = 0
    for (const o of outlineSorted) {
      if (o.is_section) {
        sectionIndex++
        lines.push(`\n## ${o.content || `Abschnitt ${sectionIndex}`}`)
      } else {
        noteIndex++
        const text = noteToText(o)
        lines.push(`- ${text}`)
      }
    }
    parts.push(`OUTLINE / NOTES:\n${lines.join('\n').trim()}`)
  }

  if (role === 'editor' && ctx.writing_content?.trim()) {
    parts.push(`AKTUELLER TEXT:\n${ctx.writing_content.trim()}`)
  }

  if (parts.length === 0) {
    return '(Noch kein Material — Kernidee, Notes und Outline sind leer.)'
  }

  return parts.join('\n\n')
}

// ============================================================
// chatSystemPrompt — full system prompt with role + context
// ============================================================
export function chatSystemPrompt(
  role: ChatRole,
  ctx: ChatContext,
  kind: 'idea' | 'project' = 'project',
): string {
  const header = CONTEXT_HEADER(ctx.title, kind)
  const rolePrompt =
    role === 'researcher' ? RESEARCHER_PROMPT
    : role === 'editor'   ? EDITOR_PROMPT
    : SPARRING_PROMPT
  const contextBlock = buildContextBlock(role, ctx)

  return `${header}\n\n${rolePrompt}\n\n---\nAKTUELLER KONTEXT\n---\n${contextBlock}`
}

// Legacy: simple sparring prompt without context (used by Garden idea chat which has no kernidee/outline shape)
export function simpleSparringPrompt(title: string | null, kind: 'idea' | 'project' = 'idea'): string {
  return `${CONTEXT_HEADER(title, kind)}\n\n${SPARRING_PROMPT}`
}

// Legacy alias kept for backwards compat (idea chat route)
export const CHAT_SYSTEM = (title: string | null, _synthesis: string | null, kind: 'idea' | 'project' = 'idea') =>
  simpleSparringPrompt(title, kind)
