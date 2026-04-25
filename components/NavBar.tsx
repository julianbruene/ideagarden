'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dump',     label: 'Dump' },
  { href: '/garden',   label: 'Garden' },
  { href: '/projects', label: 'Projects' },
  { href: '/done',     label: 'Kompost' },
]

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-garden-bg/92 backdrop-blur-md pb-safe">
      <div className="h-px w-full bg-garden-hairline-soft" />
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-3 h-14">
        {navItems.map(({ href, label }) => {
          const isActive = pathname.startsWith(href)
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

        {/* Sign out — small, dezent */}
        <button
          onClick={handleSignOut}
          className="px-3 text-garden-muted-soft hover:text-garden-ink transition-colors"
          title="Abmelden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
