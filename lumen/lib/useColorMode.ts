'use client'

import { useEffect, useState } from 'react'

export function useColorMode(): 'dark' | 'light' {
  const [mode, setMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const read = () =>
      setMode(document.documentElement.dataset.mode === 'light' ? 'light' : 'dark')
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] })
    return () => observer.disconnect()
  }, [])

  return mode
}
