import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRow, type RevolutRow } from '@/lib/ingester'
import { categorize } from '@/lib/categorizer'
import {
  mapModelCategory,
  modelConfidenceThreshold,
  predictCategories,
} from '@/lib/mlCategorizer'
import type { CategoryRule } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { rows: RevolutRow[]; filename: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { rows, filename } = body
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

  // Parse rows — drops non-COMPLETED and malformed rows
  const staged: { row: RevolutRow; category: string }[] = []
  const modelTargets: { stagedIndex: number; description: string; amount: number }[] = []
  const parsed = []
  let failed = 0

  for (const row of rows) {
    const description = row.Description ?? ''
    const amount = Number(row.Amount)
    const category = categorize(description, rules)
    const stagedIndex = staged.push({ row, category }) - 1

    if (category === 'Uncategorized' && description.trim() && Number.isFinite(amount)) {
      modelTargets.push({ stagedIndex, description, amount })
    }
  }

  let modelCategorized = 0
  if (modelTargets.length > 0) {
    try {
      const predictions = await predictCategories(
        modelTargets.map(({ description, amount }) => ({ description, amount }))
      )
      const threshold = modelConfidenceThreshold()

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i]
        const target = modelTargets[i]
        if (!prediction || !target || prediction.confidence < threshold) continue

        staged[target.stagedIndex].category = mapModelCategory(
          prediction.category,
          target.description,
          target.amount
        )
        modelCategorized++
      }
    } catch (error) {
      console.warn('[transactions/ingest] ML categorizer unavailable:', error)
    }
  }

  for (const { row, category } of staged) {
    const tx = parseRow(row, user.id, batch.id, category)
    if (tx) {
      parsed.push(tx)
    } else {
      failed++
    }
  }

  if (parsed.length === 0) {
    return NextResponse.json({ imported: 0, duplicates: failed, failed: 0, modelCategorized })
  }

  // Deduplicate against existing transactions for this user.
  // Match on completed_date + description + amount.
  const { data: existing } = await supabase
    .from('transactions')
    .select('completed_date, description, amount')
    .eq('user_id', user.id)

  // Normalize key components so type/format differences don't break matching:
  // - date: take only the YYYY-MM-DD portion (handles TIMESTAMPTZ vs raw CSV string)
  // - amount: fixed 2 decimal string (handles Supabase NUMERIC string vs JS float)
  function txKey(completed_date: string, description: string, amount: string | number) {
    const date = String(completed_date).split('T')[0].split(' ')[0]
    const amt = Number(amount).toFixed(2)
    return `${date}|${description.trim()}|${amt}`
  }

  const existingKeys = new Set(
    (existing ?? []).map((t) => txKey(t.completed_date, t.description, t.amount))
  )

  const newRows = []
  let duplicates = 0
  for (const tx of parsed) {
    const key = txKey(tx.completed_date, tx.description, tx.amount)
    if (existingKeys.has(key)) {
      duplicates++
    } else {
      newRows.push(tx)
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

  // Update batch with final counts
  await supabase
    .from('import_batches')
    .update({ imported_count: imported, duplicate_count: duplicates })
    .eq('id', batch.id)

  return NextResponse.json({ imported, duplicates, failed, modelCategorized })
}
