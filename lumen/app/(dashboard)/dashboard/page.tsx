import Link from 'next/link'
import { ArrowLeftRight, ArrowUpRight, Building2, FileText, Landmark, PiggyBank, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardUploadZone from '../DashboardUploadZone'

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
      <div className="animate-fade-up stagger-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-lumen-accent">{greeting}, {name}</p>
          <h1 className="mt-2 text-3xl font-bold text-lumen-text sm:text-4xl">Home</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/transactions" className="lumen-pill inline-flex h-11 items-center justify-center gap-2 rounded-[22px] px-4 text-sm font-bold text-lumen-text transition-colors hover:text-lumen-accent">
            Transactions
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="animate-fade-up stagger-2 lumen-glass relative overflow-hidden rounded-[28px]">
          <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="pointer-events-none absolute left-16 top-20 h-72 w-72 rounded-full bg-lumen-accent/18 blur-3xl" />

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-bold text-lumen-text tabular-nums sm:text-5xl">
                    {balance !== null ? fmt(balance, currency) : fmt(0, currency)}
                  </p>
                  <span className="lumen-pill flex h-8 w-8 items-center justify-center rounded-full text-lumen-muted">
                    <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lumen-accent text-[10px] font-bold text-white">
                    €
                  </span>
                  <span className="text-base font-semibold text-lumen-text">Personal · {currency}</span>
                </div>
                {balanceDate && <p className="mt-1 text-sm text-lumen-muted">Updated {balanceDate}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Move', Icon: ArrowLeftRight },
                  { label: 'Statement', Icon: FileText },
                  { label: 'Account details', Icon: Building2 },
                ].map(({ label, Icon }) => (
                  <Link key={label} href="/transactions" className="lumen-pill inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-lumen-text transition-colors hover:text-lumen-accent">
                    <Icon size={15} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[68%] rounded-full bg-[linear-gradient(90deg,var(--lumen-accent),#38BDF8,#10B981)]" />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-lumen-muted">
              <span>Monthly activity</span>
              <span>{rows.length} transactions</span>
            </div>
          </div>

          {recentTxs && recentTxs.length > 0 && (
            <div className="relative border-t border-white/[0.08]">
              <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                <p className="text-sm font-bold text-lumen-text">Recent activity</p>
                <Link href="/transactions" className="text-sm font-bold text-lumen-text transition-colors hover:text-lumen-accent">See all</Link>
              </div>
              <div className="pb-4">
                {recentTxs.map((tx) => {
                  const amt = Number(tx.amount)
                  const positive = amt > 0
                  return (
                    <div key={tx.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.055] sm:px-6">
                      <div className={`relative flex h-11 w-11 items-center justify-center rounded-full ${positive ? 'bg-lumen-success/20 text-lumen-success' : 'bg-sky-400/18 text-sky-200'}`}>
                        <ReceiptText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-lumen-text">{tx.description}</p>
                        <p className="mt-0.5 truncate text-sm text-lumen-muted">
                          {tx.completed_date
                            ? new Date(tx.completed_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                            : 'No date'}
                          {tx.category ? ` · ${tx.category}` : ''}
                        </p>
                      </div>
                      <span className={`text-base font-bold tabular-nums ${positive ? 'text-lumen-success' : 'text-lumen-text'}`}>
                        {positive ? '+' : ''}{fmt(amt, tx.currency ?? 'EUR')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="animate-fade-up stagger-3 grid gap-3 content-start">
          <div className="lumen-glass rounded-[28px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lumen-accent">
                <Landmark size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-lumen-text">Revolut import</p>
                <p className="text-sm text-lumen-muted">Live from CSV data</p>
              </div>
            </div>
          </div>
          {stats.map(({ label, value, Icon, tone, bg }) => (
            <div key={label} className="lumen-panel flex items-center justify-between rounded-[28px] p-5">
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
    </div>
  )
}
