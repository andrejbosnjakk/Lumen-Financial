import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from './Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-lumen-bg">
      <Sidebar email={user.email ?? ''} />
      <main className="relative flex-1 overflow-y-auto">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 18% 0%, rgb(var(--lumen-accent-rgb) / 0.13), transparent 28%), linear-gradient(180deg, rgba(247,246,242,0.03), transparent 28%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
