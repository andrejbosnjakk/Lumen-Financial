'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/account', label: 'Account' },
]

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 flex flex-col border-r border-gray-200 bg-white px-4 py-6">
      <span className="text-lg font-semibold text-gray-900 px-2 mb-8">Lumen</span>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <p className="px-3 text-xs text-gray-400 truncate">{email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
