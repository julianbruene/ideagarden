import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickMainText, isNearDuplicate, type FeedImportItem } from '@/lib/feed'

// Bulk import of posts (JSON exported via EDEN). Skips posts already
// imported (same external_id), content duplicates (same talk uploaded
// twice) and posts without readable text.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { posts?: FeedImportItem[] } | FeedImportItem[]
  const items = Array.isArray(body) ? body : body.posts ?? []
  if (items.length === 0) return NextResponse.json({ error: 'no posts' }, { status: 400 })

  const { data: existing, error: exErr } = await supabase
    .from('feed_posts')
    .select('platform, external_id, author_username, main_text')
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })

  const seenIds = new Set((existing ?? []).map((r) => `${r.platform}:${r.external_id}`))
  const seenTexts = (existing ?? []).map((r) => ({ author: r.author_username, text: r.main_text }))

  const rows = []
  let skippedExisting = 0, skippedDuplicate = 0, skippedEmpty = 0

  for (const p of items) {
    if (!p?.external_id || !p.author_username) { skippedEmpty++; continue }
    const platform = p.platform ?? 'instagram'
    if (seenIds.has(`${platform}:${p.external_id}`)) { skippedExisting++; continue }

    const { text, source } = pickMainText(p)
    if (text.split(/\s+/).filter(Boolean).length < 5) { skippedEmpty++; continue }

    if (seenTexts.some((s) => s.author === p.author_username && isNearDuplicate(s.text, text))) {
      skippedDuplicate++
      continue
    }

    seenIds.add(`${platform}:${p.external_id}`)
    seenTexts.push({ author: p.author_username, text })

    const published = p.published_at == null ? null : new Date(p.published_at).toISOString()

    rows.push({
      user_id: user.id,
      platform,
      external_id: p.external_id,
      url: p.url ?? null,
      author_username: p.author_username,
      author_name: p.author_name ?? null,
      post_type: p.post_type ?? 'post',
      published_at: published,
      caption: p.caption ?? null,
      transcript: p.transcript ?? null,
      slide_text: p.slide_text ?? null,
      on_screen_text: p.on_screen_text ?? null,
      main_text: text,
      main_source: source,
      truncated: !!p.truncated,
    })
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('feed_posts').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    imported: rows.length,
    skippedExisting,
    skippedDuplicate,
    skippedEmpty,
  })
}
