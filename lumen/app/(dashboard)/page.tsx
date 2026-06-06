import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const greeting = getGreeting()
  const name = user?.email?.split('@')[0] ?? 'there'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        {greeting}, {name}
      </h1>
      <p className="text-sm text-gray-500 mb-8">Here&apos;s your financial overview</p>

      {/* Empty state — remove once data is wired */}
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">Upload your first CSV to get started</p>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
