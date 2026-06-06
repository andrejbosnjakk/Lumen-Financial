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
    <aside className="flex h-full w-[84px] flex-shrink-0 flex-col border-r border-lumen-border bg-lumen-surface px-3 py-5 sm:w-[230px] sm:px-4">

      <Link
        href="/"
        aria-label="Go to landing page"
        className="relative z-10 flex justify-center rounded-2xl px-2 pb-8 pt-1 transition-opacity hover:opacity-80 sm:justify-start"
      >
        <LumenLogo size={31} iconOnly className="sm:hidden" />
        <LumenLogo size={31} className="hidden sm:block" />
      </Link>

      <nav className="flex-1 space-y-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors sm:justify-start sm:px-3.5 ${
                active
                  ? 'bg-lumen-surface-2 text-lumen-text'
                  : 'text-lumen-muted hover:bg-lumen-surface-2 hover:text-lumen-text'
              }`}
            >
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center ${active ? 'text-lumen-accent' : ''}`}>
                <Icon size={17} strokeWidth={2} />
              </span>
              <span className="hidden sm:inline">{label}</span>
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
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold text-lumen-text">{displayName}</p>
            <p className="truncate text-xs text-lumen-muted">{email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-lumen-muted transition-colors hover:bg-lumen-danger/10 hover:text-lumen-danger"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </aside>
  )
}
