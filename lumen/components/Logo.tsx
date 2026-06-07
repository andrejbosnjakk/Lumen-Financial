'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const LOGO_DARK  = '/brand/lumen-logo.png'       // white text — for dark mode
const LOGO_LIGHT = '/brand/lumen-logo-light.png' // dark text  — for light mode

const LOGO_W      = 1000
const LOGO_H      = 250
const LOGO_ASPECT = LOGO_W / LOGO_H

function useIsLightMode(): boolean {
  const [light, setLight] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const check = () => setLight(el.dataset.mode === 'light')
    check()
    const obs = new MutationObserver(check)
    obs.observe(el, { attributes: true, attributeFilter: ['data-mode'] })
    return () => obs.disconnect()
  }, [])
  return light
}

interface StarProps {
  size?: number
  className?: string
}

export function LumenStar({ size = 32, className }: StarProps) {
  const fullWidth = Math.round(size * LOGO_ASPECT)
  return (
    <div
      className={`flex-shrink-0 overflow-hidden ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={LOGO_DARK}
        width={fullWidth}
        height={size}
        alt=""
        aria-hidden="true"
        unoptimized
        draggable={false}
        style={{ width: fullWidth, height: size, display: 'block' }}
      />
    </div>
  )
}

interface LogoProps {
  size?: number
  className?: string
  iconOnly?: boolean
}

export function LumenLogo({ size = 28, className, iconOnly = false }: LogoProps) {
  const isLight = useIsLightMode()

  if (iconOnly) {
    return <LumenStar size={size} className={className} />
  }

  const width = Math.round(size * LOGO_ASPECT)
  const src   = isLight ? LOGO_LIGHT : LOGO_DARK

  return (
    <Image
      src={src}
      width={width}
      height={size}
      alt="Lumen"
      unoptimized
      draggable={false}
      className={`flex-shrink-0 ${className ?? ''}`}
      style={{ width, height: size, display: 'block' }}
    />
  )
}
