import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Frequency, Subscription, ZombieSubscription } from '@/lib/types'

export type { Frequency, Subscription, ZombieSubscription }

type Charge = {
  description: string
  category: string | null
  amount: number
  date: string
}

const CYCLE_DAYS: Record<Frequency, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
}

const MONTHLY_MULTIPLIER: Record<Frequency, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
}

const MAX_ACTIVE_STALE_DAYS: Record<Frequency, number> = {
  weekly: 18,
  monthly: 55,
  quarterly: 125,
  yearly: 420,
}

const KNOWN_SUBSCRIPTION_TERMS = [
  'adobe',
  'amazon prime',
  'apple',
  'audible',
  'canva',
  'chatgpt',
  'claude',
  'crunchyroll',
  'disney',
  'dropbox',
  'duolingo',
  'figma',
  'github',
  'google',
  'hbo',
  'icloud',
  'linkedin',
  'mullvad',
  'microsoft',
  'netflix',
  'notion',
  'openai',
  'patreon',
  'playstation',
  'spotify',
  'steam',
  'twitch',
  'vpn',
  'videoland',
  'xbox',
  'youtube',
]

const SUBSCRIPTION_CATEGORY_PATTERNS = [
  /\bapps?\b/,
  /application/,
  /cable/,
  /cloud/,
  /computer and data processing/,
  /continuity/,
  /digital goods/,
  /internet/,
  /large digital goods merchant/,
  /membership/,
  /music/,
  /online services?/,
  /software/,
  /streaming/,
  /subscription/,
  /telecom/,
  /video/,
]

const NON_SUBSCRIPTION_PATTERNS = [
  /atm/,
  /cash withdrawal/,
  /charit/,
  /commuter/,
  /grocery/,
  /parking/,
  /railroad/,
  /restaurant/,
  /supermarket/,
  /transfer (from|to)/,
]

function daysBetween(a: string, b: string) {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
}

function median(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function coefficientOfVariation(arr: number[]) {
  if (arr.length < 2) return 0
  const mean = arr.reduce((sum, n) => sum + n, 0) / arr.length
  if (!mean) return Infinity
  const variance = arr.reduce((sum, n) => sum + (n - mean) ** 2, 0) / arr.length
  return Math.sqrt(variance) / mean
}

function normalizeMerchant(description: string) {
  return description
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(www|com|nl|eu|bv|b\.v|inc|ltd|limited|payments?|payment|card|ideal|sepa|direct debit|recurring)\b/g, ' ')
    .replace(/\b\d{2,}\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, ' ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// A curated brand match is strong enough to surface a subscription on its own.
// A category-pattern match only loosens thresholds for series that already
// look recurring — it must never create a subscription from a single charge.
function isKnownSubscriptionBrand(charge: Charge, key: string) {
  const search = `${key} ${charge.description.toLowerCase()} ${(charge.category ?? '').toLowerCase()}`
  if (NON_SUBSCRIPTION_PATTERNS.some((pattern) => pattern.test(search))) return false
  return KNOWN_SUBSCRIPTION_TERMS.some((term) => search.includes(term))
}

function hasSubscriptionHint(charge: Charge, key: string) {
  const description = charge.description.toLowerCase()
  const category = (charge.category ?? '').toLowerCase()
  const search = `${key} ${description} ${category}`

  if (NON_SUBSCRIPTION_PATTERNS.some((pattern) => pattern.test(search))) return false
  if (KNOWN_SUBSCRIPTION_TERMS.some((term) => search.includes(term))) return true
  return SUBSCRIPTION_CATEGORY_PATTERNS.some((pattern) => pattern.test(category))
}

function detectFrequency(gaps: number[]): Frequency | null {
  if (!gaps.length) return null
  const med = median(gaps)
  if (med >= 5 && med <= 10) return 'weekly'
  if (med >= 24 && med <= 38) return 'monthly'
  if (med >= 75 && med <= 110) return 'quarterly'
  if (med >= 320 && med <= 410) return 'yearly'
  return null
}

function amountLooksRecurring(amounts: number[], hinted: boolean) {
  if (amounts.length < 2) return hinted
  const med = median(amounts)
  const maxDeviation = Math.max(...amounts.map((amount) => Math.abs(amount - med)))
  const allowedDeviation = Math.max(2, med * (hinted ? 0.35 : 0.2))
  return maxDeviation <= allowedDeviation || coefficientOfVariation(amounts) <= (hinted ? 0.3 : 0.18)
}

function buildSubscription(charges: Charge[], key: string): Subscription | null {
  const sorted = [...charges].sort((a, b) => a.date.localeCompare(b.date))
  const hinted = sorted.some((charge) => hasSubscriptionHint(charge, key))
  const knownBrand = sorted.some((charge) => isKnownSubscriptionBrand(charge, key))
  const amounts = sorted.map((charge) => charge.amount)
  const gaps = sorted.slice(1).map((charge, i) => daysBetween(sorted[i].date, charge.date))
  // Cadence must be proven from the charge gaps. Only curated brands may fall
  // back to "monthly" without it — a category hint alone never invents one.
  const frequency = detectFrequency(gaps) ?? (knownBrand ? 'monthly' : null)

  if (!frequency) return null
  if (!amountLooksRecurring(amounts, hinted)) return null

  const minCount = frequency === 'weekly' ? 3 : 2
  if (sorted.length < minCount && !knownBrand) return null

  // A single known subscription charge should still surface as a candidate;
  // many demo CSVs only include the current month.
  if (sorted.length < minCount && knownBrand) {
    const latest = sorted[sorted.length - 1]
    const monthlyEquivalent = Math.round(latest.amount * MONTHLY_MULTIPLIER.monthly * 100) / 100
    return {
      description: latest.description,
      amount: Math.round(latest.amount * 100) / 100,
      frequency: 'monthly',
      monthlyEquivalent,
      lastCharge: latest.date,
      count: sorted.length,
    }
  }

  if (gaps.length >= 2 && coefficientOfVariation(gaps) > (hinted ? 0.45 : 0.32)) return null

  const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
  const monthlyEquivalent = Math.round(avgAmount * MONTHLY_MULTIPLIER[frequency] * 100) / 100

  return {
    description: sorted[sorted.length - 1].description,
    amount: Math.round(avgAmount * 100) / 100,
    frequency,
    monthlyEquivalent,
    lastCharge: sorted[sorted.length - 1].date,
    count: sorted.length,
  }
}

function shouldReviewAsZombie(sub: Subscription, charges: Charge[], key: string, staleDays: number) {
  const hinted = charges.some((charge) => hasSubscriptionHint(charge, key))
  if (!hinted) return false

  const cheapMonthly = sub.monthlyEquivalent > 0 && sub.monthlyEquivalent <= 15
  const longRunning = sub.count >= 3
  const quietEnoughToForget = staleDays >= Math.floor(CYCLE_DAYS[sub.frequency] * 0.55)

  return cheapMonthly && (longRunning || quietEnoughToForget)
}

function compareActiveSubscriptions(
  a: { sub: Subscription; hinted: boolean; staleDays: number },
  b: { sub: Subscription; hinted: boolean; staleDays: number },
) {
  if (a.hinted !== b.hinted) return a.hinted ? -1 : 1
  if (a.staleDays !== b.staleDays) return a.staleDays - b.staleDays
  if (a.sub.monthlyEquivalent !== b.sub.monthlyEquivalent) return b.sub.monthlyEquivalent - a.sub.monthlyEquivalent
  return a.sub.description.localeCompare(b.sub.description)
}

function compareZombieSubscriptions(a: ZombieSubscription, b: ZombieSubscription) {
  if (a.zombieReason !== b.zombieReason) return a.zombieReason === 'overdue' ? -1 : 1
  if (a.staleDays !== b.staleDays) return b.staleDays - a.staleDays
  if (a.monthlyEquivalent !== b.monthlyEquivalent) return b.monthlyEquivalent - a.monthlyEquivalent
  return a.description.localeCompare(b.description)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date()
  since.setMonth(since.getMonth() - 24)

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('description, amount, completed_date, category')
    .eq('user_id', user.id)
    .lt('amount', 0)
    .gte('completed_date', since.toISOString().split('T')[0])
    .order('completed_date', { ascending: true })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!txs || txs.length === 0) return NextResponse.json({ subscriptions: [], zombies: [] })

  const groups = new Map<string, Charge[]>()
  for (const tx of txs) {
    const charge: Charge = {
      description: String(tx.description),
      category: tx.category,
      amount: Math.abs(Number(tx.amount)),
      date: String(tx.completed_date),
    }
    if (charge.amount < 1) continue

    const key = normalizeMerchant(charge.description)
    if (!key || key.length < 3) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(charge)
  }

  // A CSV export is a historical snapshot — measure staleness against the most
  // recent transaction in the data, not the wall clock. Otherwise every
  // subscription looks "overdue" once the export ages a cycle or two.
  const datasetEnd = new Date(String(txs[txs.length - 1].completed_date)).getTime()
  const now = Number.isFinite(datasetEnd) ? datasetEnd : Date.now()
  const subscriptions: { sub: Subscription; hinted: boolean; staleDays: number }[] = []
  const zombies: ZombieSubscription[] = []
  const seen = new Set<string>()

  for (const [key, charges] of Array.from(groups.entries())) {
    const sub = buildSubscription(charges, key)
    if (!sub) continue

    const dedupeKey = `${normalizeMerchant(sub.description)}|${sub.frequency}|${Math.round(sub.amount * 100)}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const staleDays = Math.round((now - new Date(sub.lastCharge).getTime()) / 86_400_000)
    const activeLimit = MAX_ACTIVE_STALE_DAYS[sub.frequency]
    const hinted = charges.some((charge) => hasSubscriptionHint(charge, key))

    subscriptions.push({ sub, hinted, staleDays })

    if (staleDays <= activeLimit && shouldReviewAsZombie(sub, charges, key, staleDays)) {
      zombies.push({
        ...sub,
        staleDays,
        zombieReason: 'forgotten',
      })
    } else if (staleDays > activeLimit && staleDays <= activeLimit * 2.25) {
      zombies.push({
        ...sub,
        staleDays,
        zombieReason: staleDays > CYCLE_DAYS[sub.frequency] * 1.4 ? 'overdue' : 'forgotten',
      })
    }
  }

  subscriptions.sort(compareActiveSubscriptions)
  zombies.sort(compareZombieSubscriptions)

  return NextResponse.json({
    subscriptions: subscriptions.slice(0, 20).map(({ sub }) => sub),
    zombies: zombies.slice(0, 12),
  })
}
