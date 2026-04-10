import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import DoneClient from './DoneClient'

export const dynamic = 'force-dynamic'

export default async function DonePage() {
  const supabase = await createClient()

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .eq('status', 'done')
    .order('completed_at', { ascending: false })

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-semibold text-garden-text">Done</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        {(ideas ?? []).length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">&#x2705;</div>
            <p className="text-sm text-garden-muted">Nothing finished yet.</p>
            <p className="text-xs text-garden-muted/60 mt-1">
              When an idea is ready to use, hit &ldquo;Ready to use&rdquo; in the Garden.
            </p>
          </div>
        ) : (
          <DoneClient ideas={ideas ?? []} />
        )}
      </main>

      <NavBar />
    </div>
  )
}
