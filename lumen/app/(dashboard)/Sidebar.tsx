'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeftRight, BarChart2, BriefcaseBusiness, LayoutDashboard, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LumenLogo } from '@/components/Logo'
import ThemeSwitcher from '@/components/ThemeSwitcher'

const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', Icon: BarChart2 },
  { href: '/portfolio', label: 'Portfolio', Icon: BriefcaseBusiness },
  { href: '/account', label: 'Account', Icon: User },
]

function initials(displayName: string, email: string) {
  const name = displayName || email.split('@')[0] || 'user'
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'LU'
}

export default function Sidebar({ email, displayName }: { email: string; displayName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-lumen-border bg-lumen-surface/92 px-4 backdrop-blur-xl md:hidden">
      <Link href="/" aria-label="Go to landing page" className="flex items-center">
        <LumenLogo size={29} />
      </Link>
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-lumen-accent text-xs font-bold text-white shadow-accent-glow-sm">
        {initials(displayName, email)}
      </div>
    </header>

    <aside className="hidden h-full w-[84px] flex-shrink-0 flex-col border-r border-lumen-border bg-lumen-surface px-3 py-5 md:flex lg:w-[230px] lg:px-4">

      <Link
        href="/"
        aria-label="Go to landing page"
        className="relative z-10 flex justify-center rounded-2xl px-2 pb-8 pt-1 transition-opacity hover:opacity-80 lg:justify-start"
      >
        <LumenLogo size={31} iconOnly className="lg:hidden" />
        <LumenLogo size={31} className="hidden lg:block" />
      </Link>

      <nav className="flex-1 space-y-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors lg:justify-start lg:px-3.5 ${
                active
                  ? 'bg-lumen-surface-2 text-lumen-text'
                  : 'text-lumen-muted hover:bg-lumen-surface-2 hover:text-lumen-text'
              }`}
            >
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center ${active ? 'text-lumen-accent' : ''}`}>
                <Icon size={17} strokeWidth={2} />
              </span>
              <span className="hidden lg:inline">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mb-3">
        <ThemeSwitcher />
      </div>

      <div className="mt-2 rounded-xl border border-lumen-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-lumen-accent text-sm font-bold text-white shadow-accent-glow-sm">
            {initials(displayName, email)}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-lumen-text">{displayName}</p>
            <p className="truncate text-xs text-lumen-muted">{email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-lumen-muted transition-colors hover:bg-lumen-danger/10 hover:text-lumen-danger"
        >
          <LogOut size={15} />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>

    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-lumen-border bg-lumen-surface/94 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${
                active
                  ? 'bg-lumen-accent/15 text-lumen-accent'
                  : 'text-lumen-muted hover:bg-lumen-fill hover:text-lumen-text'
              }`}
            >
              <Icon size={18} strokeWidth={2.1} />
              <span className="leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
    </>
  )
}
