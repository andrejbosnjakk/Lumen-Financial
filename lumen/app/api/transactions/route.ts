import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('completed_date', { ascending: false })
    .range(from, to)

  const category = searchParams.get('category')
  if (category) query = query.eq('category', category)

  const search = searchParams.get('search')
  if (search) query = query.ilike('description', `%${search}%`)

  const fromDate = searchParams.get('from')
  if (fromDate) query = query.gte('completed_date', fromDate)

  const toDate = searchParams.get('to')
  if (toDate) query = query.lte('completed_date', toDate)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const categories = new Set<string>()
  const CATEGORY_PAGE_SIZE = 1000

  for (let start = 0; ; start += CATEGORY_PAGE_SIZE) {
    const { data: categoryRows, error: categoryError } = await supabase
      .from('transactions')
      .select('category')
      .eq('user_id', user.id)
      .range(start, start + CATEGORY_PAGE_SIZE - 1)

    if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 })

    for (const row of categoryRows ?? []) {
      if (row.category) categories.add(row.category)
    }

    if (!categoryRows || categoryRows.length < CATEGORY_PAGE_SIZE) break
  }

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
  })
}
