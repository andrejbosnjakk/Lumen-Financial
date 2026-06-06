import { Bot, Clock3, FileText, ShieldCheck, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AiProviderForm from './AiProviderForm'
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

  const totalImported = batches?.reduce((sum, batch) => sum + Number(batch.imported_count ?? 0), 0) ?? 0
  const totalDuplicates = batches?.reduce((sum, batch) => sum + Number(batch.duplicate_count ?? 0), 0) ?? 0
  const metadataProfile = {
    id: user!.id,
    first_name: (user?.user_metadata?.first_name as string | undefined) ?? null,
    last_name: (user?.user_metadata?.last_name as string | undefined) ?? null,
    phone: (user?.user_metadata?.phone as string | undefined) ?? null,
    date_of_birth: (user?.user_metadata?.date_of_birth as string | undefined) ?? null,
    updated_at: new Date().toISOString(),
  } as Profile

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-lumen-text sm:text-4xl">Account</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-lumen-muted">
            Profile, password, and import history.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <ProfileForm initialProfile={(profile as Profile | null) ?? metadataProfile} email={user?.email ?? ''} />

        <div className="space-y-5">
          <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-lumen-text">Security</h2>
                <p className="mt-1 text-xs text-lumen-muted">Update the password for this account.</p>
              </div>
            </div>
            <ChangePasswordForm />
          </section>

          <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
                <UploadCloud size={20} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-lumen-text">Import totals</h2>
                <p className="mt-1 text-xs text-lumen-muted">Totals from uploaded CSV files.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-lumen-fill p-4">
                <p className="text-xs text-lumen-muted">Imported</p>
                <p className="mt-2 text-2xl font-semibold text-lumen-text tabular-nums">{totalImported}</p>
              </div>
              <div className="rounded-2xl bg-lumen-fill p-4">
                <p className="text-xs text-lumen-muted">Duplicates</p>
                <p className="mt-2 text-2xl font-semibold text-lumen-text tabular-nums">{totalDuplicates}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-lumen-text">AI assistant</h2>
            <p className="mt-1 text-xs text-lumen-muted">Connect Groq (free), Claude, or ChatGPT to ask questions about your finances.</p>
          </div>
        </div>
        <AiProviderForm />
      </section>

      <section className="animate-fade-up stagger-2 lumen-panel overflow-hidden rounded-[28px]">
        <div className="flex items-center justify-between border-b border-lumen-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-lumen-text">Import history</h2>
            <p className="mt-1 text-xs text-lumen-muted">CSV uploads linked to this account.</p>
          </div>
        </div>

        {!batches || batches.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
              <FileText size={20} />
            </div>
            <p className="text-sm font-semibold text-lumen-text">No imports yet</p>
            <p className="mt-1 text-sm text-lumen-muted">Upload a Revolut CSV to start building history.</p>
          </div>
        ) : (
          <div className="divide-y divide-lumen-border">
            {batches.map((b) => (
              <div key={b.id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-lumen-fill-sm sm:grid-cols-[1fr_110px_110px_130px] sm:items-center sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
                    <FileText size={18} />
                  </div>
                  <p className="truncate text-sm font-semibold text-lumen-text">{b.filename}</p>
                </div>
                <p className="text-sm text-lumen-muted sm:text-right">
                  <span className="sm:hidden">Imported: </span>{b.imported_count}
                </p>
                <p className="text-sm text-lumen-muted sm:text-right">
                  <span className="sm:hidden">Duplicates: </span>{b.duplicate_count}
                </p>
                <p className="flex items-center gap-2 text-sm text-lumen-muted sm:justify-end">
                  <Clock3 size={14} />
                  {fmt(b.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
