import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from './Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .maybeSingle()

  const firstName = profile?.first_name ?? (user.user_metadata?.first_name as string | undefined)
  const lastName = profile?.last_name ?? (user.user_metadata?.last_name as string | undefined)

  const displayName = [firstName, lastName]
    .filter(Boolean)
    .join(' ')
    || user.email?.split('@')[0]
    || 'Lumen user'

  return (
    <div className="flex h-screen overflow-hidden bg-lumen-bg">
      <Sidebar email={user.email ?? ''} displayName={displayName} />
      <main className="flex-1 overflow-y-auto bg-lumen-bg">
        <div className="max-w-[1360px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
