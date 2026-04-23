'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dump',     label: 'Dump',     icon: DumpIcon },
  { href: '/garden',   label: 'Garden',   icon: GardenIcon },
  { href: '/projects', label: 'Projects', icon: ProjectsIcon },
  { href: '/done',     label: 'Kompost',  icon: KompostIcon },
]

function DumpIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function GardenIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 8 8 4 4 4c0 4 2.5 7.5 8 8z" />
      <path d="M12 12c0-4 4-8 8-8 0 4-2.5 7.5-8 8z" />
      <path d="M5 22h14" />
    </svg>
  )
}

function ProjectsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  )
}

function KompostIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
      <path d="M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" />
      <path d="M12 10v8" />
    </svg>
  )
}

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-garden-surface/95 backdrop-blur-md border-t border-garden-border/60 pb-safe">
      <div className="flex items-stretch justify-around max-w-lg md:max-w-xl mx-auto px-2 h-14">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-1 px-3 py-2 flex-1 group"
            >
              <div
                className={`transition-colors ${
                  active ? 'text-garden-accent' : 'text-garden-muted/70 group-hover:text-garden-text'
                }`}
              >
                <Icon active={active} />
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide transition-all ${
                  active
                    ? 'text-garden-accent opacity-100'
                    : 'text-garden-muted/70 opacity-0 group-hover:opacity-60'
                }`}
              >
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-garden-accent rounded-b-full" />
              )}
            </Link>
          )
        })}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-garden-muted/50 hover:text-garden-text transition-colors"
          title="Abmelden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
