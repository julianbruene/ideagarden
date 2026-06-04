/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Migration runner — applies pending SQL files in supabase/ to the
 * database in SUPABASE_DB_URL, tracking what's applied in a
 * _migrations table.
 *
 * Usage:
 *   npm run migrate           — apply all pending migrations
 *   npm run migrate -- --status — show which are applied vs. pending,
 *                                 without running anything
 *
 * Connection string in .env.local as SUPABASE_DB_URL=postgres://...
 */
import { Client } from 'pg'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'

// Load .env.local (Next.js convention) — falls back to .env
config({ path: '.env.local' })
config()

const DB_URL = process.env.SUPABASE_DB_URL
if (!DB_URL) {
  console.error('\n  ✗ SUPABASE_DB_URL not set.')
  console.error('    Add it to .env.local. Get the value from')
  console.error('    Supabase Dashboard → Project Settings → Database → Connection string (URI).\n')
  process.exit(1)
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase')
const statusOnly = process.argv.includes('--status')

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^migration_\d+.*\.sql$/.test(f))
    .sort() // lexical sort matches numeric ordering for zero-padded names
}

async function main() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  try {
    // Tracking table — created if missing.
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    const { rows: applied } = await client.query<{ filename: string; applied_at: Date }>(
      'SELECT filename, applied_at FROM _migrations ORDER BY filename'
    )
    const appliedSet = new Set(applied.map((r) => r.filename))

    const files = listMigrationFiles()
    const pending = files.filter((f) => !appliedSet.has(f))

    if (statusOnly) {
      console.log('\n  Migrations status\n')
      const pad = Math.max(...files.map((f) => f.length))
      for (const f of files) {
        const row = applied.find((a) => a.filename === f)
        const mark = row ? '✓' : '·'
        const when = row ? row.applied_at.toISOString().slice(0, 19).replace('T', ' ') : 'pending'
        console.log(`  ${mark}  ${f.padEnd(pad + 2)}${when}`)
      }
      const todo = files.length - applied.length
      console.log(`\n  ${applied.length} applied · ${todo} pending\n`)
      return
    }

    if (pending.length === 0) {
      console.log('\n  ✓ Up to date — nothing to apply.\n')
      return
    }

    console.log(`\n  Applying ${pending.length} migration${pending.length === 1 ? '' : 's'}…\n`)

    for (const filename of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
      process.stdout.write(`  → ${filename} … `)
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [filename]
        )
        await client.query('COMMIT')
        console.log('✓')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        console.log('✗')
        console.error(`\n  Migration failed: ${filename}`)
        console.error(err instanceof Error ? err.message : err)
        process.exit(1)
      }
    }

    console.log('\n  ✓ All migrations applied.\n')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('\n  Unhandled error:', err)
  process.exit(1)
})
