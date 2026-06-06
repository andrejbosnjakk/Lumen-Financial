import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardUploadZone from './DashboardUploadZone'

function fmt(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amount)
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const greeting = getGreeting()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user!.id)
    .maybeSingle()

  const name = profile?.first_name || user?.email?.split('@')[0] || 'there'

  // Check if any transactions exist
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  if (!count) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          {greeting}, {name}
        </h1>
        <p className="text-sm text-gray-500 mb-8">Here&apos;s your financial overview</p>
        <DashboardUploadZone />
      </div>
    )
  }

  // Latest non-null balance (most recent transaction with a balance reading)
  const { data: latestTx } = await supabase
    .from('transactions')
    .select('balance_after_transaction, currency, completed_date')
    .eq('user_id', user!.id)
    .not('balance_after_transaction', 'is', null)
    .order('completed_date', { ascending: false })
    .limit(1)
    .single()

  // This month's income + expenses
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: thisMonthTxs } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user!.id)
    .gte('completed_date', monthStart)

  const rows = thisMonthTxs ?? []
  const monthIncome = rows.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
  const monthExpenses = rows.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const monthNet = monthIncome - monthExpenses

  const balance = latestTx?.balance_after_transaction ? Number(latestTx.balance_after_transaction) : null
  const currency = latestTx?.currency ?? 'EUR'

  const balanceDate = latestTx?.completed_date
    ? new Date(latestTx.completed_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        {greeting}, {name}
      </h1>
      <p className="text-sm text-gray-500 mb-8">Here&apos;s your financial overview</p>

      {/* Balance card */}
      {balance !== null && (
        <div className="bg-gray-900 text-white rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400 mb-1">Current balance</p>
          <p className="text-4xl font-semibold tracking-tight">{fmt(balance, currency)}</p>
          {balanceDate && (
            <p className="text-xs text-gray-500 mt-2">As of {balanceDate}</p>
          )}
        </div>
      )}

      {/* This month stats */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">This month</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Income</p>
          <p className="text-xl font-semibold text-emerald-600">{fmt(monthIncome, currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Expenses</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(monthExpenses, currency)}</p>
        </div>
        <div className={`bg-white rounded-xl border border-gray-200 p-4`}>
          <p className="text-xs text-gray-500 mb-1">Net</p>
          <p className={`text-xl font-semibold ${monthNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {monthNet >= 0 ? '+' : ''}{fmt(monthNet, currency)}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/transactions"
          className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
        >
          View all transactions
        </Link>
        <span className="text-gray-300">·</span>
        <Link
          href="/analytics"
          className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
        >
          Analytics
        </Link>
      </div>
    </div>
  )
}
