import Link from 'next/link'
import { ArrowUpRight, Landmark, PiggyBank, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardUploadZone from './DashboardUploadZone'

function fmt(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amount)
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const greeting = getGreeting()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user!.id)
    .maybeSingle()

  const name = profile?.first_name || user?.email?.split('@')[0] || 'there'

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  if (!count) {
    return (
      <div className="animate-fade-up">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-medium text-lumen-accent">{greeting}, {name}</p>
          <h1 className="mt-2 text-3xl font-semibold text-lumen-text sm:text-4xl">
            Illuminate your Revolut export.
          </h1>
          <p className="mt-3 text-sm leading-6 text-lumen-muted">
            Drop in a CSV to unlock balances, monthly movement, and a categorized transaction stream.
          </p>
        </div>
        <DashboardUploadZone />
      </div>
    )
  }

  const { data: latestTx } = await supabase
    .from('transactions')
    .select('balance_after_transaction, currency, completed_date')
    .eq('user_id', user!.id)
    .not('balance_after_transaction', 'is', null)
    .order('completed_date', { ascending: false })
    .limit(1)
    .single()

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: monthTxs } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user!.id)
    .gte('completed_date', monthStart)

  const rows = monthTxs ?? []
  const monthIncome = rows.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
  const monthExpenses = rows.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const monthNet = monthIncome - monthExpenses

  const balance = latestTx?.balance_after_transaction ? Number(latestTx.balance_after_transaction) : null
  const currency = latestTx?.currency ?? 'EUR'
  const balanceDate = latestTx?.completed_date
    ? new Date(latestTx.completed_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('id, description, amount, currency, completed_date, category')
    .eq('user_id', user!.id)
    .order('completed_date', { ascending: false })
    .limit(8)

  const stats = [
    { label: 'Income', value: monthIncome, Icon: TrendingUp, tone: 'text-lumen-success', bg: 'bg-lumen-success/10' },
    { label: 'Expenses', value: monthExpenses, Icon: TrendingDown, tone: 'text-lumen-warning', bg: 'bg-lumen-warning/10' },
    { label: 'Net flow', value: monthNet, Icon: PiggyBank, tone: monthNet >= 0 ? 'text-lumen-success' : 'text-lumen-danger', bg: monthNet >= 0 ? 'bg-lumen-success/10' : 'bg-lumen-danger/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="animate-fade-up stagger-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-lumen-accent">{greeting}, {name}</p>
          <h1 className="mt-2 text-3xl font-semibold text-lumen-text sm:text-4xl">Your money, clarified.</h1>
          <p className="mt-2 text-sm text-lumen-muted">A focused view of balance, flow, and recent activity.</p>
        </div>
        <Link
          href="/transactions"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-lumen-text transition-colors hover:border-lumen-accent/45 hover:text-lumen-accent"
        >
          Transactions
          <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="animate-fade-up stagger-2 relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(135deg,#171A29_0%,#0D0F1A_58%,#151827_100%)] p-6 shadow-accent-glow sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lumen-accent/20 blur-3xl" />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-32 w-full"
            style={{ background: 'linear-gradient(90deg, rgb(var(--lumen-accent-rgb) / 0.13), rgba(16,185,129,0.08), transparent)' }}
          />
          <div className="relative flex min-h-[260px] flex-col justify-between">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lumen-accent">
                  <Landmark size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-lumen-text">Current balance</p>
                  <p className="text-xs text-lumen-muted">{balanceDate ? `Updated ${balanceDate}` : 'Latest imported balance'}</p>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-lumen-muted">
                Revolut
              </span>
            </div>

            <div>
              <p className="text-5xl font-semibold text-lumen-text tabular-nums sm:text-6xl">
                {balance !== null ? fmt(balance, currency) : fmt(0, currency)}
              </p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-[linear-gradient(90deg,var(--lumen-accent),#10B981)]" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-lumen-muted">
                <span>Monthly activity</span>
                <span>{rows.length} transactions</span>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-fade-up stagger-3 grid gap-3">
          {stats.map(({ label, value, Icon, tone, bg }) => (
            <div key={label} className="lumen-panel flex items-center justify-between rounded-[24px] p-5">
              <div>
                <p className="text-sm font-medium text-lumen-muted">{label}</p>
                <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>
                  {label === 'Net flow' && value > 0 ? '+' : ''}{fmt(value, currency)}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bg} ${tone}`}>
                <Icon size={22} />
              </div>
            </div>
          ))}
        </section>
      </div>

      {recentTxs && recentTxs.length > 0 && (
        <section className="animate-fade-up stagger-4 lumen-panel overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-lumen-text">Recent transactions</p>
              <p className="mt-1 text-xs text-lumen-muted">Latest imported movement from your account.</p>
            </div>
            <Link href="/transactions" className="text-sm font-semibold text-lumen-muted transition-colors hover:text-lumen-accent">
              View all
            </Link>
          </div>

          <div className="divide-y divide-white/[0.07]">
            {recentTxs.map((tx) => {
              const amt = Number(tx.amount)
              const positive = amt > 0
              return (
                <div key={tx.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.035] sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${positive ? 'bg-lumen-success/10 text-lumen-success' : 'bg-white/[0.055] text-lumen-accent'}`}>
                      <ReceiptText size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-lumen-text">{tx.description}</p>
                      <p className="mt-1 text-xs text-lumen-muted">
                        {tx.completed_date
                          ? new Date(tx.completed_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                          : 'No date'}
                        {tx.category ? ` / ${tx.category}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-sm font-bold tabular-nums ${positive ? 'text-lumen-success' : 'text-lumen-text'}`}>
                    {positive ? '+' : ''}{fmt(amt, tx.currency ?? 'EUR')}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
