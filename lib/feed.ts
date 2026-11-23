// Picks the most readable text for a social post (Lesen tab).
//
// Rules, derived from testing real EDEN data:
// - Spoken reels: the audio transcript is best — but only if it is long
//   enough for the video and agrees with the on-screen captions. Music-only
//   reels yield song lyrics or vendor error strings instead.
// - Word-by-word burned-in captions are fragments; usable as fallback only
//   when they form real sentences (enough words).
// - Carousels / static posts: slide text is the content; captions are often
//   just a teaser. Screenshot slides of app UI (Substack, profile) are noise.

export type FeedPostType = 'reel' | 'carousel' | 'post'
export type FeedMainSource = 'transcript' | 'slides' | 'onscreen' | 'caption'

export interface FeedImportItem {
  platform?: string
  external_id: string
  url?: string | null
  author_username: string
  author_name?: string | null
  post_type?: FeedPostType
  published_at?: string | number | null
  duration_seconds?: number | null
  caption?: string | null
  transcript?: string | null
  slide_text?: string | null
  on_screen_text?: string | null
  truncated?: boolean
}

const JUNK_TRANSCRIPT = [
  /please provide the (video|audio)/i,
  /i (can't|cannot) transcribe/i,
  /no (speech|audio) (detected|found)/i,
]

const UI_WORDS = [
  'home', 'essays', 'resources', 'about', 'dashboard', 'subscribers',
  'share', 'link in bio', 'paid', 'rising in', 'start here', 'back',
]

function words(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []
}

function wordCount(s: string | null | undefined): number {
  return s ? words(s).length : 0
}

// Share of distinct meaningful on-screen words that also occur in the transcript.
function overlap(transcript: string, onScreen: string): number {
  const t = new Set(words(transcript))
  const o = Array.from(new Set(words(onScreen).filter((w) => w.length > 3)))
  if (o.length === 0) return 1
  return o.filter((w) => t.has(w)).length / o.length
}

export function transcriptUsable(
  transcript: string | null | undefined,
  onScreen: string | null | undefined,
  durationSeconds: number | null | undefined,
): boolean {
  if (!transcript) return false
  if (JUNK_TRANSCRIPT.some((re) => re.test(transcript))) return false
  const n = wordCount(transcript)
  const minWords = Math.max(15, Math.round((durationSeconds ?? 0) * 0.8))
  if (n < minWords) return false
  if (onScreen && wordCount(onScreen) >= 8 && overlap(transcript, onScreen) < 0.4) return false
  return true
}

// Join OCR line breaks into flowing text: a line continues the previous one
// unless the previous ended a sentence.
function joinLines(lines: string[]): string {
  let out = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!out) { out = line; continue }
    out += /[.!?:"”…]$/.test(out) ? '\n' + line : ' ' + line
  }
  return out
}

function isUiSlide(text: string): boolean {
  const lower = text.toLowerCase()
  return UI_WORDS.filter((w) => lower.includes(w)).length >= 3
}

// Byline / metadata lines on title slides: "KIKI", "AUG 09, 2026 • PAID", "@handle"
function isMetaLine(line: string): boolean {
  const l = line.trim()
  if (/^@[\w.]+$/.test(l)) return true
  if (/^[A-ZÄÖÜ]+$/.test(l) && l.length <= 12) return true
  if (/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s\d{1,2},\s\d{4}\b/.test(l)) return true
  return false
}

export function cleanSlides(slideText: string): string {
  const slides = slideText
    .split(/^\s*Slide \d+:\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean)
  return slides
    .filter((s) => !isUiSlide(s))
    .map((s) => joinLines(s.split('\n').filter((l) => !isMetaLine(l))))
    .filter((s) => wordCount(s) > 0)
    .join('\n\n')
}

// Burned-in captions: one phrase per line. Line ends carry stray commas;
// keep the phrases as lines (reads like the video's rhythm).
export function cleanOnScreen(text: string): string {
  const lines = text.split('\n').map((l) => l.trim().replace(/,$/, '')).filter(Boolean)
  return lines.filter((l, i) => l !== lines[i - 1]).join('\n')
}

export function pickMainText(p: FeedImportItem): { text: string; source: FeedMainSource } {
  const isReel = p.post_type === 'reel'

  if (isReel && transcriptUsable(p.transcript, p.on_screen_text, p.duration_seconds)) {
    return { text: p.transcript!.trim(), source: 'transcript' }
  }

  if (p.slide_text) {
    const slides = cleanSlides(p.slide_text)
    if (wordCount(slides) >= 15) return { text: slides, source: 'slides' }
  }

  if (p.on_screen_text) {
    const onScreen = cleanOnScreen(p.on_screen_text)
    // Word-by-word captions have many 1–2 word lines; require real sentences.
    const lines = p.on_screen_text.split('\n').filter((l) => l.trim())
    const avg = lines.length ? wordCount(p.on_screen_text) / lines.length : 0
    if (wordCount(onScreen) >= 15 && avg >= 2.5) return { text: onScreen, source: 'onscreen' }
  }

  return { text: (p.caption ?? '').trim(), source: 'caption' }
}

// Duplicate detection (same talk uploaded twice, transcribed slightly
// differently): word-set overlap of the opening ~60 words.
export function isNearDuplicate(a: string, b: string): boolean {
  const wa = new Set(words(a).slice(0, 60))
  const wb = new Set(words(b).slice(0, 60))
  if (wa.size < 10 || wb.size < 10) return false
  const inter = Array.from(wa).filter((w) => wb.has(w)).length
  return inter / (wa.size + wb.size - inter) >= 0.8
}
