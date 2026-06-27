import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Insight } from '@/lib/types'

export type { Insight }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pull last 4 months of transactions
  const fourMonthsAgo = new Date()
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, category, completed_date, description')
    .eq('user_id', user.id)
    .gte('completed_date', fourMonthsAgo.toISOString().split('T')[0])
    .order('completed_date', { ascending: true })

  const rows = txs ?? []
  if (rows.length === 0) return NextResponse.json({ insights: [] })

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  // Bucket into months
  const byMonth: Record<string, { income: number; expenses: number; byCategory: Record<string, number> }> = {}
  const descByMonth: Record<string, Record<string, number[]>> = {} // desc → monthKey → amounts
  const dayOfWeekSpend: number[] = new Array(7).fill(0)

  for (const tx of rows) {
    const amount = Number(tx.amount)
    const dateStr = String(tx.completed_date).substring(0, 10)
    const monthKey = dateStr.substring(0, 7)
    const dow = new Date(dateStr + 'T12:00:00').getDay() // 0=Sun

    if (!byMonth[monthKey]) byMonth[monthKey] = { income: 0, expenses: 0, byCategory: {} }
    if (amount > 0) byMonth[monthKey].income += amount
    else {
      const abs = Math.abs(amount)
      byMonth[monthKey].expenses += abs
      byMonth[monthKey].byCategory[tx.category] = (byMonth[monthKey].byCategory[tx.category] ?? 0) + abs
      dayOfWeekSpend[dow] += abs
    }

    if (amount < 0) {
      if (!descByMonth[tx.description]) descByMonth[tx.description] = {}
      if (!descByMonth[tx.description][monthKey]) descByMonth[tx.description][monthKey] = []
      descByMonth[tx.description][monthKey].push(Math.abs(amount))
    }
  }

  const insights: Insight[] = []

  // ── Spending velocity ────────────────────────────────────────────────────────
  const prevMonths = Object.keys(byMonth).filter((k) => k !== thisMonthKey).slice(-3)
  if (prevMonths.length >= 1 && byMonth[thisMonthKey]) {
    const avgPrevExpenses = prevMonths.reduce((s, k) => s + byMonth[k].expenses, 0) / prevMonths.length
    const thisExpenses = byMonth[thisMonthKey].expenses
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projectedExpenses = (thisExpenses / dayOfMonth) * daysInMonth

    if (avgPrevExpenses > 0) {
      const velocityPct = Math.round((thisExpenses / avgPrevExpenses) * 100)
      const projectedPct = Math.round((projectedExpenses / avgPrevExpenses) * 100)
      const fmt = (n: number) => `€${Math.round(n).toLocaleString('nl-NL')}`

      if (projectedPct > 120) {
        insights.push({
          type: 'velocity',
          title: 'Spending on track to exceed average',
          body: `You've spent ${fmt(thisExpenses)} in ${dayOfMonth} days. At this rate you'll hit ${fmt(projectedExpenses)} — ${projectedPct - 100}% over your ${fmt(avgPrevExpenses)} monthly average.`,
          tone: 'warning',
          value: `${velocityPct}% of avg`,
        })
      } else if (projectedPct < 80) {
        insights.push({
          type: 'velocity',
          title: 'Well under your spending average',
          body: `${fmt(thisExpenses)} spent so far — projected ${fmt(projectedExpenses)} this month, ${100 - projectedPct}% below your ${fmt(avgPrevExpenses)} average.`,
          tone: 'positive',
          value: `${velocityPct}% of avg`,
        })
      } else {
        insights.push({
          type: 'velocity',
          title: 'Spending at normal pace',
          body: `${fmt(thisExpenses)} spent in ${dayOfMonth} days — on track for ${fmt(projectedExpenses)}, in line with your ${fmt(avgPrevExpenses)} monthly average.`,
          tone: 'neutral',
          value: `${velocityPct}% of avg`,
        })
      }
    }
  }

  // ── Savings rate ─────────────────────────────────────────────────────────────
  if (byMonth[thisMonthKey] && byMonth[lastMonthKey]) {
    const cur = byMonth[thisMonthKey]
    const prev = byMonth[lastMonthKey]
    const curRate = cur.income > 0 ? ((cur.income - cur.expenses) / cur.income) * 100 : null
    const prevRate = prev.income > 0 ? ((prev.income - prev.expenses) / prev.income) * 100 : null

    if (curRate !== null && prevRate !== null) {
      const diff = Math.round(curRate - prevRate)
      const tone = curRate >= 20 ? 'positive' : curRate >= 0 ? 'neutral' : 'danger'
      insights.push({
        type: 'savings',
        title: 'Savings rate this month',
        body: diff === 0
          ? `Saving ${Math.round(curRate)}% of income — same as last month.`
          : `Saving ${Math.round(curRate)}% of income, ${Math.abs(diff)}pp ${diff > 0 ? 'higher' : 'lower'} than last month's ${Math.round(prevRate)}%.`,
        tone,
        value: `${Math.round(curRate)}%`,
      })
    }
  }

  // ── Category anomalies ───────────────────────────────────────────────────────
  if (byMonth[thisMonthKey] && prevMonths.length >= 2) {
    const thisCategories = byMonth[thisMonthKey].byCategory
    for (const [cat, thisAmt] of Object.entries(thisCategories)) {
      if (cat === 'Uncategorized') continue
      const prevAmts = prevMonths.map((k) => byMonth[k]?.byCategory[cat] ?? 0)
      const avgPrev = prevAmts.reduce((s, v) => s + v, 0) / prevAmts.length
      if (avgPrev < 5) continue // ignore near-zero baseline
      const ratio = thisAmt / avgPrev
      if (ratio >= 2.0) {
        insights.push({
          type: 'anomaly',
          title: `${cat} is unusually high`,
          body: `€${Math.round(thisAmt).toLocaleString('nl-NL')} spent on ${cat} this month — ${ratio.toFixed(1)}x your ${Math.round(avgPrev).toLocaleString('nl-NL')} monthly average.`,
          tone: ratio >= 3 ? 'danger' : 'warning',
          value: `${ratio.toFixed(1)}x avg`,
        })
      }
    }
  }

  // ── Recurring charges ────────────────────────────────────────────────────────
  const recurring: { desc: string; avgAmount: number; count: number }[] = []
  for (const [desc, monthAmounts] of Object.entries(descByMonth)) {
    const months = Object.keys(monthAmounts)
    if (months.length < 2) continue
    // All amounts within 15% of each other → subscription-like
    const allAmounts = months.flatMap((m) => monthAmounts[m])
    const avg = allAmounts.reduce((s, v) => s + v, 0) / allAmounts.length
    const maxDeviation = Math.max(...allAmounts.map((a) => Math.abs(a - avg) / avg))
    if (maxDeviation <= 0.15 && avg <= 200) {
      recurring.push({ desc, avgAmount: avg, count: months.length })
    }
  }
  recurring.sort((a, b) => b.avgAmount - a.avgAmount)

  if (recurring.length > 0) {
    const top = recurring.slice(0, 5)
    const totalMonthly = top.reduce((s, r) => s + r.avgAmount, 0)
    const listed = top.map((r) => `${r.desc} (€${r.avgAmount.toFixed(2)})`).join(', ')
    insights.push({
      type: 'recurring',
      title: `${recurring.length} recurring charge${recurring.length > 1 ? 's' : ''} detected`,
      body: `€${Math.round(totalMonthly).toLocaleString('nl-NL')}/month across top subscriptions: ${listed}.`,
      tone: 'neutral',
      value: `€${Math.round(totalMonthly)}/mo`,
    })
  }

  // ── Top spending day ─────────────────────────────────────────────────────────
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const maxDow = dayOfWeekSpend.indexOf(Math.max(...dayOfWeekSpend))
  const totalDays = rows.filter((t) => Number(t.amount) < 0).length
  if (totalDays > 14 && dayOfWeekSpend[maxDow] > 0) {
    const weekCount = Math.ceil(rows.length / 7) || 1
    const avgOnDay = dayOfWeekSpend[maxDow] / Math.max(weekCount, 1)
    insights.push({
      type: 'pattern',
      title: `You spend most on ${dayNames[maxDow]}s`,
      body: `${dayNames[maxDow]}s average €${Math.round(avgOnDay).toLocaleString('nl-NL')} in spending — more than any other day of the week.`,
      tone: 'neutral',
      value: dayNames[maxDow],
    })
  }

  // ── Largest transaction this month ───────────────────────────────────────────
  const thisMonthTxs = rows.filter((t) => {
    const m = String(t.completed_date).substring(0, 7)
    return m === thisMonthKey && Number(t.amount) < 0
  })
  if (thisMonthTxs.length > 0) {
    const largest = thisMonthTxs.reduce((max, t) =>
      Math.abs(Number(t.amount)) > Math.abs(Number(max.amount)) ? t : max
    )
    const largestAmt = Math.abs(Number(largest.amount))
    insights.push({
      type: 'largest',
      title: 'Largest transaction this month',
      body: `€${largestAmt.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at ${largest.description}${largest.category ? ` (${largest.category})` : ''}.`,
      tone: 'neutral',
      value: `€${Math.round(largestAmt)}`,
    })
  }

  return NextResponse.json({ insights })
}
