'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dump',   label: 'Dump',   icon: DumpIcon },
  { href: '/garden', label: 'Garden', icon: GardenIcon },
  { href: '/done',   label: 'Done',   icon: DoneIcon },
]

function DumpIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function GardenIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 8 8 4 4 4c0 4 2.5 7.5 8 8z" />
      <path d="M12 12c0-4 4-8 8-8-0 4-2.5 7.5-8 8z" />
      <path d="M5 22h14" />
    </svg>
  )
}

function DoneIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-garden-surface/95 backdrop-blur-sm border-t border-garden-border pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 h-14">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
                active
                  ? 'text-garden-accent'
                  : 'text-garden-muted hover:text-garden-text'
              }`}
            >
              <Icon active={active} />
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-garden-accent' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-garden-muted hover:text-garden-text transition-colors"
          title="Sign out"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide">Out</span>
        </button>
      </div>
    </nav>
  )
}
