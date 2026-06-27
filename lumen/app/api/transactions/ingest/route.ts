import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorize } from '@/lib/categorizer'
import {
  modelConfidenceThreshold,
  predictCategories,
} from '@/lib/mlCategorizer'
import type { CategoryRule } from '@/lib/types'
import type { NormalisedRow, BankId } from '@/lib/parsers'

const LEGACY_APP_CATEGORIES = new Set([
  'Groceries',
  'Transport',
  'Subscriptions',
  'Housing',
  'Dining',
  'Health',
  'Income',
  'Savings',
  'Shopping',
  'Transfers',
  'Uncategorized',
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { rows: NormalisedRow[]; filename: string; source: BankId }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { rows, filename, source } = body
  if (!Array.isArray(rows) || !filename) {
    return NextResponse.json({ error: 'Missing rows or filename' }, { status: 400 })
  }

  // Fetch user's custom category rules
  const { data: customRules } = await supabase
    .from('category_rules')
    .select('keyword, category')
    .eq('user_id', user.id)

  const rules: Pick<CategoryRule, 'keyword' | 'category'>[] = customRules ?? []

  // Create import batch record upfront so we have the ID
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({ user_id: user.id, filename, imported_count: 0, duplicate_count: 0 })
    .select('id')
    .single()

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 })
  }

  // Stage rows with rule-based categories
  const staged: { row: NormalisedRow; category: string }[] = []
  const modelTargets: { stagedIndex: number; description: string; amount: number; completed_date: string }[] = []
  const parsed = []
  let failed = 0

  for (const row of rows) {
    const description = row.description ?? ''
    const amount = Number(row.amount)
    const category = categorize(description, rules)
    const stagedIndex = staged.push({ row, category }) - 1

    if (description.trim() && Number.isFinite(amount)) {
      modelTargets.push({
        stagedIndex,
        description,
        amount,
        completed_date: row.date,
      })
    }
  }

  let modelCategorized = 0
  if (modelTargets.length > 0) {
    try {
      const predictions = await predictCategories(
        modelTargets.map(({ description, amount, completed_date }) => ({
          description,
          amount,
          completed_date,
        })),
        { timeoutMs: 120000 }
      )
      const threshold = modelConfidenceThreshold()

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i]
        const target = modelTargets[i]
        if (!prediction || !target || prediction.confidence < threshold) continue

        staged[target.stagedIndex].category = prediction.category || 'Uncategorized'
        modelCategorized++
      }
    } catch (error) {
      console.warn('[transactions/ingest] ML categorizer unavailable:', error)
    }
  }

  for (const { row, category } of staged) {
    if (!row.description?.trim() || !Number.isFinite(row.amount)) {
      failed++
      continue
    }
    parsed.push({
      user_id: user.id,
      source: source ?? 'unknown',
      type: row.type ?? 'PAYMENT',
      product: null,
      started_date: row.date,
      completed_date: row.date,
      description: row.description.trim(),
      amount: row.amount,
      fee: 0,
      currency: row.currency ?? 'EUR',
      state: 'COMPLETED',
      balance_after_transaction: row.balance_after ?? null,
      category,
      is_recurring: false,
      import_batch_id: batch.id,
    })
  }

  if (parsed.length === 0) {
    return NextResponse.json({ imported: 0, duplicates: failed, failed: 0, modelCategorized })
  }

  // Deduplicate against existing transactions for this user.
  // Match on completed_date + description + amount.
  const existing: {
    id: string
    completed_date: string
    description: string
    amount: string | number
    category: string | null
    created_at: string
  }[] = []
  const EXISTING_PAGE_SIZE = 1000

  for (let from = 0; ; from += EXISTING_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, completed_date, description, amount, category, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .range(from, from + EXISTING_PAGE_SIZE - 1)

    if (error) {
      return NextResponse.json({ error: 'Failed to check existing transactions' }, { status: 500 })
    }

    existing.push(...(data ?? []))
    if (!data || data.length < EXISTING_PAGE_SIZE) break
  }

  // Normalize key components so type/format differences don't break matching:
  // - date: take only the YYYY-MM-DD portion (handles TIMESTAMPTZ vs raw CSV string)
  // - amount: fixed 2 decimal string (handles Supabase NUMERIC string vs JS float)
  function txKey(completed_date: string, description: string, amount: string | number) {
    const date = String(completed_date).split('T')[0].split(' ')[0]
    const amt = Number(amount).toFixed(2)
    const normalizedDescription = description.trim().replace(/\s+/g, ' ').toLowerCase()
    return `${date}|${normalizedDescription}|${amt}`
  }

  function isKnownCategory(category: string | null | undefined) {
    return Boolean(category && category !== 'Uncategorized')
  }

  function shouldUpdateDuplicateCategory(existingCategory: string | null | undefined, nextCategory: string) {
    if (!nextCategory || nextCategory === 'Uncategorized') return false
    if (!existingCategory || existingCategory === 'Uncategorized') return true
    return existingCategory !== nextCategory && LEGACY_APP_CATEGORIES.has(existingCategory)
  }

  const existingGroups = new Map<string, typeof existing>()
  for (const transaction of existing) {
    const key = txKey(transaction.completed_date, transaction.description, transaction.amount)
    const group = existingGroups.get(key) ?? []
    group.push(transaction)
    existingGroups.set(key, group)
  }

  const existingByKey = new Map<string, (typeof existing)[number]>()
  const duplicateIdsToDelete: string[] = []
  const duplicateCategoryUpdates: { id: string; category: string }[] = []

  for (const [key, group] of Array.from(existingGroups.entries())) {
    const keeper = group.find((transaction) => isKnownCategory(transaction.category)) ?? group[0]
    existingByKey.set(key, keeper)

    const bestCategory = group.find((transaction) => isKnownCategory(transaction.category))?.category
    if (bestCategory && !isKnownCategory(keeper.category)) {
      duplicateCategoryUpdates.push({ id: keeper.id, category: bestCategory })
      keeper.category = bestCategory
    }

    for (const transaction of group) {
      if (transaction.id !== keeper.id) duplicateIdsToDelete.push(transaction.id)
    }
  }

  const newRows = []
  let duplicates = 0

  for (const tx of parsed) {
    const key = txKey(tx.completed_date, tx.description, tx.amount)
    const existingMatch = existingByKey.get(key)
    if (existingMatch) {
      duplicates++
      if (existingMatch.id && shouldUpdateDuplicateCategory(existingMatch.category, tx.category)) {
        duplicateCategoryUpdates.push({ id: existingMatch.id, category: tx.category })
        existingMatch.category = tx.category
      }
    } else {
      newRows.push(tx)
      existingByKey.set(key, {
        id: '',
        completed_date: tx.completed_date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        created_at: '',
      })
    }
  }

  // Bulk insert in chunks of 500 to stay within Supabase limits
  const CHUNK = 500
  let imported = 0
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const chunk = newRows.slice(i, i + CHUNK)
    const { error } = await supabase.from('transactions').insert(chunk)
    if (error) {
      failed += chunk.length
    } else {
      imported += chunk.length
    }
  }

  let recategorizedDuplicates = 0
  for (const update of duplicateCategoryUpdates) {
    const { error } = await supabase
      .from('transactions')
      .update({ category: update.category })
      .eq('user_id', user.id)
      .eq('id', update.id)

    if (!error) recategorizedDuplicates++
  }

  let removedExistingDuplicates = 0
  for (let i = 0; i < duplicateIdsToDelete.length; i += CHUNK) {
    const chunk = duplicateIdsToDelete.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
      .in('id', chunk)

    if (!error) removedExistingDuplicates += chunk.length
  }

  // Update batch with final counts
  await supabase
    .from('import_batches')
    .update({ imported_count: imported, duplicate_count: duplicates })
    .eq('id', batch.id)

  return NextResponse.json({
    imported,
    duplicates,
    failed,
    modelCategorized,
    recategorizedDuplicates,
    removedExistingDuplicates,
  })
}
