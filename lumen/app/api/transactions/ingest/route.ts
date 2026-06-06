import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: implement ingestion pipeline
  // 1. Parse body (rows: RevolutRow[], filename: string)
  // 2. Filter COMPLETED rows via parseRow() from lib/ingester
  // 3. Deduplicate against existing transactions
  // 4. Categorize via categorize() from lib/categorizer (+ user's category_rules)
  // 5. Create import_batch record
  // 6. Bulk insert transactions
  // 7. Return IngestResult

  return NextResponse.json({ imported: 0, duplicates: 0, failed: 0 })
}
