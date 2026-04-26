import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono micro-caps text-garden-muted-soft">Settings</span>
          <span className="h-px flex-1 bg-garden-hairline" />
        </div>
        <h1
          className="font-display display-tight balance text-garden-ink"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
        >
          Daten <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>&amp;</em> Backup.
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        <SettingsClient />
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
