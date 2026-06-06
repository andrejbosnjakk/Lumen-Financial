import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type Subscription = {
  description: string
  amount: number
  frequency: Frequency
  monthlyEquivalent: number
  lastCharge: string
  count: number
}

// Minimum number of observed charges before we trust a pattern.
// 2 data points = 1 gap = zero ability to distinguish pattern from coincidence.
const MIN_COUNT: Record<Frequency, number> = {
  weekly:    4,   // need at least 3 gaps to confirm weekly cadence
  monthly:   3,   // need at least 2 gaps to confirm monthly cadence
  quarterly: 3,
  yearly:    2,   // yearly is long; 2 occurrences (1 gap) is acceptable
}

// How many days since the last charge before we consider it cancelled.
const MAX_STALE_DAYS: Record<Frequency, number> = {
  weekly:    21,
  monthly:   50,
  quarterly: 120,
  yearly:    400,
}

const MONTHLY_MULTIPLIER: Record<Frequency, number> = {
  weekly:    52 / 12,
  monthly:   1,
  quarterly: 1 / 3,
  yearly:    1 / 12,
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

function cv(arr: number[]): number {
  if (arr.length < 2) return 0 // single value: treat as perfectly consistent
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  if (mean === 0) return Infinity
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length)
  return std / mean
}

function detectFrequency(medianGapDays: number): Frequency | null {
  if (medianGapDays >= 5   && medianGapDays <= 10)  return 'weekly'
  if (medianGapDays >= 25  && medianGapDays <= 35)  return 'monthly'
  if (medianGapDays >= 85  && medianGapDays <= 96)  return 'quarterly'
  if (medianGapDays >= 350 && medianGapDays <= 380) return 'yearly'
  return null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: txs } = await supabase
    .from('transactions')
    .select('description, amount, completed_date')
    .eq('user_id', user.id)
    .lt('amount', 0)
    .order('completed_date', { ascending: true })

  if (!txs || txs.length === 0) return NextResponse.json({ subscriptions: [] })

  // Group by normalised description
  const groups = new Map<string, { description: string; amount: number; date: string }[]>()
  for (const tx of txs) {
    const key = tx.description.toLowerCase().trim()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({
      description: tx.description,
      amount: Math.abs(Number(tx.amount)),
      date: String(tx.completed_date),
    })
  }

  const now = Date.now()
  const subscriptions: Subscription[] = []

  for (const charges of groups.values()) {
    const sorted = charges.sort((a, b) => a.date.localeCompare(b.date))
    const amounts = sorted.map(c => c.amount)

    // Amounts must be very consistent — subscriptions rarely change price (5% tolerance)
    if (cv(amounts) > 0.05) continue

    // Compute day-gaps between consecutive charges
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const ms = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()
      gaps.push(ms / 86_400_000)
    }

    if (gaps.length === 0) continue

    const medGap = median(gaps)
    const freq = detectFrequency(medGap)
    if (!freq) continue

    // Minimum occurrences: single coincidences must not qualify
    if (sorted.length < MIN_COUNT[freq]) continue

    // Gap timing must be consistent (20% CV max — tighter than before)
    if (cv(gaps) > 0.20) continue

    // Skip if the last charge is too old — subscription likely cancelled
    const lastDate = new Date(sorted[sorted.length - 1].date).getTime()
    const staleDays = (now - lastDate) / 86_400_000
    if (staleDays > MAX_STALE_DAYS[freq]) continue

    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length

    subscriptions.push({
      description: sorted[sorted.length - 1].description,
      amount: Math.round(avgAmount * 100) / 100,
      frequency: freq,
      monthlyEquivalent: Math.round(avgAmount * MONTHLY_MULTIPLIER[freq] * 100) / 100,
      lastCharge: sorted[sorted.length - 1].date,
      count: sorted.length,
    })
  }

  subscriptions.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)

  return NextResponse.json({ subscriptions })
}
