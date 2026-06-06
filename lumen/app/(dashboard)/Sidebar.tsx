'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftRight, BarChart2, LayoutDashboard, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LumenLogo } from '@/components/Logo'
import ThemeSwitcher from '@/components/ThemeSwitcher'

const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { href: '/analytics', label: 'Analytics', Icon: BarChart2 },
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
    <aside className="relative flex h-full w-[84px] flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.08] bg-[#00101d]/82 px-3 py-5 backdrop-blur-2xl sm:w-[230px] sm:px-4">
      <div className="pointer-events-none absolute -left-28 top-24 h-64 w-64 rounded-full bg-lumen-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-0 h-44 w-44 rounded-full bg-lumen-success/10 blur-3xl" />

      <Link
        href="/"
        aria-label="Go to landing page"
        className="relative z-10 flex justify-center rounded-2xl px-2 pb-8 pt-1 transition-opacity hover:opacity-80 sm:justify-start"
      >
        <LumenLogo size={31} iconOnly className="sm:hidden" />
        <LumenLogo size={31} className="hidden sm:block" />
      </Link>

      <nav className="relative z-10 flex-1 space-y-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className="block">
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={`relative flex min-h-12 items-center justify-center gap-3 overflow-hidden rounded-[20px] px-3.5 text-sm font-bold transition-colors sm:justify-start ${
                  active
                    ? 'bg-white/14 text-white shadow-accent-glow-sm ring-1 ring-white/12'
                    : 'text-lumen-muted hover:bg-white/[0.08] hover:text-lumen-text'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-fill"
                    className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={`relative flex h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-lumen-accent text-white' : 'bg-white/[0.07]'}`}>
                  <Icon size={17} strokeWidth={active ? 2.25 : 1.9} />
                </span>
                <span className="relative hidden sm:inline">{label}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="relative z-10 mb-3">
        <ThemeSwitcher />
      </div>

      <div className="relative z-10 mt-2 rounded-[24px] p-3 lumen-glass">
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
