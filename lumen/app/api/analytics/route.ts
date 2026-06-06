import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: implement aggregation queries
  // Filter by ?month=2025-05, return AnalyticsData shape from lib/types

  return NextResponse.json({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    byCategory: {},
    byMonth: [],
    topMerchants: [],
    recurring: [],
  })
}
