import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Account</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
        <p className="text-sm text-gray-500 mb-1">Signed in as</p>
        <p className="text-sm font-medium text-gray-900">{user?.email}</p>
      </div>
    </div>
  )
}
