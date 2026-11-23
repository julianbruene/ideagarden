/**
 * Bridge between Lesen drafts and the EDEN scheduler (driven by Claude).
 *
 *   npm run feed:drafts                       — list drafts marked "ready" (JSON)
 *   npm run feed:drafts -- sent <id> <edenId> — mark one as sent to EDEN
 */
import { Client } from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })
config({ quiet: true })

async function main() {
  const DB_URL = process.env.SUPABASE_DB_URL
  if (!DB_URL) throw new Error('SUPABASE_DB_URL not set in .env.local')
  const [cmd, id, edenId] = process.argv.slice(2)

  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  try {
    if (cmd === 'sent') {
      if (!id || !edenId) throw new Error('usage: sent <id> <edenId>')
      const r = await client.query(
        `UPDATE feed_posts SET draft_status = 'sent', eden_post_id = $2
         WHERE id = $1 AND draft_status = 'ready'`,
        [id, edenId]
      )
      console.log(r.rowCount === 1 ? `marked ${id} as sent` : `no ready draft with id ${id}`)
      return
    }

    const { rows } = await client.query(
      `SELECT id, author_name, author_username, url, draft, draft_platform, draft_updated_at
       FROM feed_posts WHERE draft_status = 'ready' ORDER BY draft_updated_at`
    )
    console.log(JSON.stringify(rows, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('✗', err instanceof Error ? err.message : err)
  process.exit(1)
})
