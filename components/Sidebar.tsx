'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dump',     label: 'Dump',     hint: '⌘1' },
  { href: '/garden',   label: 'Garden',   hint: '⌘2' },
  { href: '/projects', label: 'Projects', hint: '⌘3' },
  { href: '/done',     label: 'Kompost',  hint: '⌘4' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col bg-garden-bg border-r border-garden-hairline z-30">
      {/* Brand */}
      <div className="px-6 pt-6 pb-8">
        <Link href="/dump" className="block">
          <span className="flex items-baseline gap-2">
            {/* Mark: italic & + coral dot */}
            <span className="relative inline-block" style={{ width: 28, height: 28 }}>
              <span
                className="font-display absolute inset-0 flex items-center justify-center text-garden-ink"
                style={{ fontStyle: 'italic', fontWeight: 500, fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em' }}
              >&amp;</span>
              <span
                className="absolute rounded-full bg-garden-accent"
                style={{ width: 5, height: 5, top: 2, right: 0 }}
              />
            </span>
            <span className="font-display display-tight text-[20px] leading-none text-garden-ink" style={{ fontWeight: 500 }}>
              Idea <em className="text-garden-accent" style={{ fontStyle: 'italic' }}>Garden</em>
            </span>
          </span>
        </Link>
        <div className="font-mono micro-caps mt-2 text-garden-muted-soft">v 0.3</div>
      </div>

      {/* Tabs */}
      <nav className="px-3 flex flex-col gap-0.5">
        {navItems.map(({ href, label, hint }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-garden-surface text-garden-ink border border-garden-hairline'
                  : 'border border-transparent text-garden-muted hover:text-garden-ink'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {isActive && <span className="w-1 h-4 rounded-full bg-garden-accent" />}
                <span
                  className="font-display text-[15px]"
                  style={{
                    fontWeight: isActive ? 500 : 400,
                    fontStyle: isActive ? 'italic' : 'normal',
                  }}
                >
                  {label}
                </span>
              </span>
              <span className="font-mono text-[10px] text-garden-muted-soft">{hint}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer — sign out */}
      <div className="mt-auto px-6 py-5 border-t border-garden-hairline-soft">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[12px] text-garden-muted hover:text-garden-ink transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
