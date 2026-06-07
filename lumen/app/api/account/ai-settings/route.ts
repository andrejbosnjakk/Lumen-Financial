import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return NextResponse.json({ configured: false, hasAppFallback: !!process.env.GROQ_API_KEY })

  const key = data.api_key as string
  const maskedKey = key.length > 8 ? `...${key.slice(-4)}` : '••••'

  return NextResponse.json({ configured: true, provider: data.provider, maskedKey })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, api_key } = await request.json()
  if (!provider || !api_key?.trim()) {
    return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
  }
  if (!['groq', 'anthropic', 'openai'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_ai_settings')
    .upsert({ user_id: user.id, provider, api_key: api_key.trim(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('user_ai_settings')
    .delete()
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
