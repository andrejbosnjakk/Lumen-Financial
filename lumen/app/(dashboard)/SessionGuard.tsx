'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REMEMBER_ME_KEY = 'lumen_remember_me'
// 15 minutes without remember-me, 24 hours with
const TIMEOUT_DEFAULT = 15 * 60 * 1000
const TIMEOUT_REMEMBERED = 24 * 60 * 60 * 1000
const WARN_BEFORE = 60 * 1000

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)

  const signOut = useCallback(async () => {
    setShowWarning(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login?message=Your+session+expired+due+to+inactivity')
    router.refresh()
  }, [router])

  const resetTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warnRef.current) clearTimeout(warnRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setShowWarning(false)

    const remembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
    const timeout = remembered ? TIMEOUT_REMEMBERED : TIMEOUT_DEFAULT

    warnRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(60)
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(countdownRef.current!); return 0 }
          return s - 1
        })
      }, 1000)
    }, timeout - WARN_BEFORE)

    timeoutRef.current = setTimeout(signOut, timeout)
  }, [signOut])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }))
    resetTimers()

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warnRef.current) clearTimeout(warnRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [resetTimers])

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-lumen-surface border border-lumen-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold text-lumen-text mb-2">Session expiring soon</h2>
            <p className="text-[13px] text-lumen-muted mb-5">
              For your security, you&apos;ll be signed out in{' '}
              <span className="font-semibold text-lumen-text">{secondsLeft}s</span> due to inactivity.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={signOut}
                className="px-4 py-2 text-[13px] font-medium text-lumen-muted hover:text-lumen-text transition-colors"
              >
                Sign out now
              </button>
              <button
                onClick={resetTimers}
                className="px-4 py-2 text-[13px] font-medium text-white bg-lumen-accent rounded-lg hover:opacity-90 transition-opacity"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
