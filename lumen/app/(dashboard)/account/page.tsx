import { createClient } from '@/lib/supabase/server'
import ChangePasswordForm from './ChangePasswordForm'
import ProfileForm from './ProfileForm'
import type { Profile } from '@/lib/types'

function fmt(date: string) {
  return new Date(date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .maybeSingle()

  const { data: batches } = await supabase
    .from('import_batches')
    .select('id, filename, imported_count, duplicate_count, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Account</h1>

      {/* Profile */}
      <ProfileForm
        initialProfile={profile as Profile | null}
        email={user?.email ?? ''}
      />

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h2>
        <ChangePasswordForm />
      </div>

      {/* Import history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Import History</h2>
        </div>
        {!batches || batches.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400">No imports yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">File</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Imported</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Duplicates</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-3 text-sm text-gray-900 max-w-xs truncate">{b.filename}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right">{b.imported_count}</td>
                  <td className="px-6 py-3 text-sm text-gray-400 text-right">{b.duplicate_count}</td>
                  <td className="px-6 py-3 text-sm text-gray-400 text-right whitespace-nowrap">{fmt(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
