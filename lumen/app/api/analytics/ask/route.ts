import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

type Period = 'week' | 'month' | '3months' | 'year' | 'all'

function getDateRange(period: Period): { from: string; to: string } | null {
  if (period === 'all') return null
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  const from = new Date(today)
  if (period === 'week') from.setDate(today.getDate() - 7)
  else if (period === 'month') from.setMonth(today.getMonth() - 1)
  else if (period === '3months') from.setMonth(today.getMonth() - 3)
  else if (period === 'year') from.setFullYear(today.getFullYear() - 1)
  return { from: from.toISOString().split('T')[0], to }
}

function periodLabel(period: Period): string {
  return { week: 'last 7 days', month: 'last month', '3months': 'last 3 months', year: 'this year', all: 'all time' }[period]
}

function fmt(n: number) {
  return `€${n.toFixed(2)}`
}

async function buildFinancialContext(userId: string, period: Period): Promise<string> {
  const supabase = await createClient()
  const range = getDateRange(period)

  let query = supabase
    .from('transactions')
    .select('amount, category, completed_date, description')
    .eq('user_id', userId)
    .order('completed_date', { ascending: true })

  if (range) {
    query = query.gte('completed_date', range.from).lte('completed_date', range.to)
  }

  const { data: txs } = await query
  const rows = txs ?? []

  if (rows.length === 0) return 'No transactions found for this period.'

  let totalIncome = 0
  let totalExpenses = 0
  const byCategory: Record<string, number> = {}
  const byMonth: Record<string, { income: number; expenses: number }> = {}
  const merchantMap: Record<string, { total: number; count: number }> = {}

  for (const tx of rows) {
    const amount = Number(tx.amount)
    const month = String(tx.completed_date).substring(0, 7)

    if (!byMonth[month]) byMonth[month] = { income: 0, expenses: 0 }

    if (amount > 0) {
      totalIncome += amount
      byMonth[month].income += amount
    } else {
      const abs = Math.abs(amount)
      totalExpenses += abs
      byMonth[month].expenses += abs
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + abs
      if (!merchantMap[tx.description]) merchantMap[tx.description] = { total: 0, count: 0 }
      merchantMap[tx.description].total += abs
      merchantMap[tx.description].count++
    }
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0.0'

  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  ${cat}: ${fmt(amt)}`)
    .join('\n')

  const monthLines = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, v]) => `  ${m}: income ${fmt(v.income)} / expenses ${fmt(v.expenses)} / net ${fmt(v.income - v.expenses)}`)
    .join('\n')

  const merchantLines = Object.entries(merchantMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10)
    .map(([desc, v], i) => `  ${i + 1}. ${desc} ${fmt(v.total)} (${v.count}×)`)
    .join('\n')

  return `PERIOD: ${periodLabel(period)}

SUMMARY
Income:    ${fmt(totalIncome)}
Expenses:  ${fmt(totalExpenses)}
Net:       ${fmt(totalIncome - totalExpenses)} (${savingsRate}% savings rate)

SPENDING BY CATEGORY
${categoryLines || '  (none)'}

MONTHLY BREAKDOWN
${monthLines || '  (none)'}

TOP MERCHANTS
${merchantLines || '  (none)'}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, period = 'month', history = [] } = await request.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 })

  const { data: aiSettings } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!aiSettings) {
    return NextResponse.json(
      { error: 'No AI provider configured. Set one up in Account settings.' },
      { status: 400 }
    )
  }

  const context = await buildFinancialContext(user.id, period as Period)

  const systemPrompt = `You are a personal finance assistant inside Lumen, a financial intelligence app.
Answer the user's questions using only the data provided below. Be specific with numbers.
Keep answers concise (2–4 sentences unless a detailed breakdown is asked for).
If the data is insufficient to answer, say so briefly.

${context}`

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...history.slice(-6),
    { role: 'user', content: question.trim() },
  ]

  try {
    if (aiSettings.provider === 'groq') {
      const client = new OpenAI({
        apiKey: aiSettings.api_key,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      })
      const answer = response.choices[0]?.message?.content ?? ''
      return NextResponse.json({ answer })
    }

    if (aiSettings.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: aiSettings.api_key })
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      })
      const answer = response.content[0].type === 'text' ? response.content[0].text : ''
      return NextResponse.json({ answer })
    }

    if (aiSettings.provider === 'openai') {
      const client = new OpenAI({ apiKey: aiSettings.api_key })
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      })
      const answer = response.choices[0]?.message?.content ?? ''
      return NextResponse.json({ answer })
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[analytics/ask] error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('Incorrect API key')) {
      return NextResponse.json({ error: 'API key rejected — check it in Account settings.' }, { status: 401 })
    }
    if (msg.includes('insufficient_quota') || msg.includes('exceeded your current quota') || msg.includes('credit balance is too low')) {
      return NextResponse.json({ error: 'Your API quota is exhausted — add credits to your provider account or switch providers in Account settings.' }, { status: 402 })
    }
    if (msg.includes('rate_limit_exceeded') || msg.includes('Rate limit reached')) {
      return NextResponse.json({ error: 'Rate limited — wait a few seconds and try again.' }, { status: 429 })
    }
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 })
  }
}
