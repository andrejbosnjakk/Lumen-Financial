import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRow, type RevolutRow } from '@/lib/ingester'
import { categorize } from '@/lib/categorizer'
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
  const parsed = []
  let failed = 0
  for (const row of rows) {
    const tx = parseRow(row, user.id, batch.id, categorize(row.Description ?? '', rules))
    if (tx) {
      parsed.push(tx)
    } else {
      failed++
    }
  }

  if (parsed.length === 0) {
    return NextResponse.json({ imported: 0, duplicates: failed, failed: 0 })
  }

  // Deduplicate against existing transactions for this user.
  // Match on completed_date + description + amount.
  const { data: existing } = await supabase
    .from('transactions')
    .select('completed_date, description, amount')
    .eq('user_id', user.id)

  const existingKeys = new Set(
    (existing ?? []).map((t) => `${t.completed_date}|${t.description}|${t.amount}`)
  )

  const newRows = []
  let duplicates = 0
  for (const tx of parsed) {
    const key = `${tx.completed_date}|${tx.description}|${tx.amount}`
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

  return NextResponse.json({ imported, duplicates, failed })
}
