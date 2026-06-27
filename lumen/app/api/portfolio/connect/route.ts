import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { api_key, api_secret, broker = 'trading212' } = await request.json()
  if (!api_key?.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('brokerage_connections')
    .upsert(
      {
        user_id: user.id,
        broker,
        api_key: api_key.trim(),
        api_secret: api_secret?.trim() ?? null,
        account_type: 'live',
      },
      { onConflict: 'user_id,broker' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('brokerage_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('broker', 'trading212')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
