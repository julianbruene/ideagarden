'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Workspace = 'garden' | 'lernen' | 'fiction'

const gardenNav = [
  { href: '/dump',     label: 'Dump' },
  { href: '/garden',   label: 'Garden' },
  { href: '/projects', label: 'Projects' },
  { href: '/done',     label: 'Kompost' },
  { href: '/handwerk', label: 'Handwerk' },
]

const lernenNav = [
  { href: '/lernen/leitfragen', label: 'Leitfragen' },
  { href: '/lernen', label: 'Konzepte' },
  { href: '/lernen/quellen', label: 'Quellen' },
]

const fictionNav = [
  { href: '/fiction/dump', label: 'Dump' },
  { href: '/fiction',      label: 'Texte' },
]

const workspaces: { key: Workspace; label: string; home: string }[] = [
  { key: 'garden',  label: 'Garden',  home: '/dump' },
  { key: 'lernen',  label: 'Lernen',  home: '/lernen' },
  { key: 'fiction', label: 'Fiction', home: '/fiction' },
]

function workspaceOf(pathname: string): Workspace {
  if (pathname.startsWith('/fiction')) return 'fiction'
  if (pathname.startsWith('/lernen')) return 'lernen'
  return 'garden'
}

function navFor(ws: Workspace) {
  if (ws === 'lernen') return lernenNav
  if (ws === 'fiction') return fictionNav
  return gardenNav
}

function isTabActive(href: string, pathname: string): boolean {
  if (href === '/lernen') {
    return pathname === '/lernen'
      || (pathname.startsWith('/lernen/')
          && !pathname.startsWith('/lernen/leitfragen')
          && !pathname.startsWith('/lernen/quellen'))
  }
  if (href === '/fiction') {
    return pathname === '/fiction'
      || (pathname.startsWith('/fiction/') && !pathname.startsWith('/fiction/dump'))
  }
  return pathname.startsWith(href)
}

export default function NavBar() {
  const pathname = usePathname()
  const ws = workspaceOf(pathname)
  const navItems = navFor(ws)
  const settingsActive = pathname.startsWith('/settings')

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-garden-bg/92 backdrop-blur-md pb-safe">
      <div className="h-px w-full bg-garden-hairline-soft" />
      {/* Workspace switcher row */}
      <div className="flex items-center justify-center gap-1 py-1 border-b border-garden-hairline-soft">
        {workspaces.map((w) => (
          <Link
            key={w.key}
            href={w.home}
            className={`px-3 py-0.5 rounded-full font-mono micro-caps transition-colors ${
              ws === w.key ? 'bg-garden-surface text-garden-ink border border-garden-hairline' : 'text-garden-muted-soft'
            }`}
          >
            {w.label}
          </Link>
        ))}
      </div>
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-3 h-14">
        {navItems.map(({ href, label }) => {
          const isActive = isTabActive(href, pathname)
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center justify-center flex-1"
            >
              <span
                className="font-display text-[16px]"
                style={{
                  fontWeight: isActive ? 500 : 400,
                  fontStyle: isActive ? 'italic' : 'normal',
                  color: isActive ? '#1B1A17' : '#837F76',
                  letterSpacing: '-0.01em',
                }}
              >
                {label}
              </span>
              {isActive && (
                <span className="absolute -bottom-px left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full bg-garden-accent" />
              )}
            </Link>
          )
        })}

        {/* Settings — cog icon, dezent */}
        <Link
          href="/settings"
          className={`px-3 flex items-center transition-colors ${
            settingsActive ? 'text-garden-ink' : 'text-garden-muted-soft hover:text-garden-ink'
          }`}
          title="Einstellungen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </Link>
      </div>
    </nav>
  )
}
