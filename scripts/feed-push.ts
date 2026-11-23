/**
 * Writes posts from a feed-import JSON file straight into feed_posts —
 * same selection/dedupe rules as the in-app import, no clicking needed.
 *
 * Usage:
 *   npm run feed:push -- feed-import/<file>.json
 *   npm run feed:push            (all files in feed-import/ not yet pushed)
 *
 * Needs SUPABASE_DB_URL in .env.local. The owner is the only user in
 * auth.users, or FEED_USER_ID if there are several.
 */
import { Client } from 'pg'
import { readFileSync, readdirSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { config } from 'dotenv'
import { pickMainText, isNearDuplicate, type FeedImportItem } from '../lib/feed'

config({ path: '.env.local' })
config()

const DB_URL = process.env.SUPABASE_DB_URL
if (!DB_URL) {
  console.error('\n  ✗ SUPABASE_DB_URL not set in .env.local.\n')
  process.exit(1)
}

const DIR = join(process.cwd(), 'feed-import')
const DONE = join(DIR, 'done')

function filesToPush(): string[] {
  const arg = process.argv.slice(2).find((a) => a.endsWith('.json'))
  if (arg) return [arg]
  if (!existsSync(DIR)) return []
  return readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => join(DIR, f))
}

async function main() {
  const files = filesToPush()
  if (files.length === 0) {
    console.log('\n  Nothing to push.\n')
    return
  }

  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  try {
    let userId = process.env.FEED_USER_ID
    if (!userId) {
      const { rows } = await client.query<{ id: string }>('SELECT id FROM auth.users')
      if (rows.length !== 1) throw new Error(`Found ${rows.length} users — set FEED_USER_ID.`)
      userId = rows[0].id
    }

    const { rows: existing } = await client.query<{ platform: string; external_id: string; author_username: string; main_text: string }>(
      'SELECT platform, external_id, author_username, main_text FROM feed_posts WHERE user_id = $1',
      [userId]
    )
    const seenIds = new Set(existing.map((r) => `${r.platform}:${r.external_id}`))
    const seenTexts = existing.map((r) => ({ author: r.author_username, text: r.main_text }))

    for (const file of files) {
      const raw = JSON.parse(readFileSync(file, 'utf8'))
      const items: FeedImportItem[] = Array.isArray(raw) ? raw : raw.posts ?? []
      let imported = 0, existingCount = 0, dup = 0, empty = 0

      for (const p of items) {
        if (!p?.external_id || !p.author_username) { empty++; continue }
        const platform = p.platform ?? 'instagram'
        if (seenIds.has(`${platform}:${p.external_id}`)) { existingCount++; continue }

        const { text, source } = pickMainText(p)
        if (text.split(/\s+/).filter(Boolean).length < 5) { empty++; continue }
        if (seenTexts.some((s) => s.author === p.author_username && isNearDuplicate(s.text, text))) { dup++; continue }

        const published = p.published_at == null ? null : new Date(p.published_at).toISOString()
        await client.query(
          `INSERT INTO feed_posts (user_id, platform, external_id, url, author_username, author_name,
             post_type, published_at, caption, transcript, slide_text, on_screen_text,
             main_text, main_source, truncated)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (user_id, platform, external_id) DO NOTHING`,
          [userId, platform, p.external_id, p.url ?? null, p.author_username, p.author_name ?? null,
           p.post_type ?? 'post', published, p.caption ?? null, p.transcript ?? null,
           p.slide_text ?? null, p.on_screen_text ?? null, text, source, !!p.truncated]
        )
        seenIds.add(`${platform}:${p.external_id}`)
        seenTexts.push({ author: p.author_username, text })
        imported++
      }

      console.log(`  ✓ ${basename(file)}: ${imported} neu · ${existingCount} schon da · ${dup} doppelt · ${empty} ohne Text`)

      // Move pushed files out of the way so the next run only sees new ones.
      if (file.startsWith(DIR)) {
        mkdirSync(DONE, { recursive: true })
        renameSync(file, join(DONE, basename(file)))
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('\n  ✗', err instanceof Error ? err.message : err, '\n')
  process.exit(1)
})
