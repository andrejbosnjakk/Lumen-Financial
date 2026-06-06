import Image from 'next/image'

const SYMBOL_SRC = '/brand/lumen-symbol-pixel-faithful.png'
const LOGO_SRC = '/brand/lumen-logo-pixel-faithful.png'
const SYMBOL_WIDTH = 966
const SYMBOL_HEIGHT = 979
const LOGO_ASPECT = 1928 / 524

interface StarProps {
  size?: number
  className?: string
}

export function LumenStar({ size = 32, className }: StarProps) {
  return (
    <Image
      src={SYMBOL_SRC}
      width={SYMBOL_WIDTH}
      height={SYMBOL_HEIGHT}
      alt=""
      aria-hidden="true"
      unoptimized
      className={`block flex-shrink-0 object-contain ${className ?? ''}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}

interface LogoProps {
  size?: number
  className?: string
  iconOnly?: boolean
  darkText?: boolean
}

export function LumenLogo({ size = 28, className, iconOnly = false }: LogoProps) {
  if (iconOnly) {
    return <LumenStar size={size} className={className} />
  }

  const width = Math.round(size * LOGO_ASPECT)

  return (
    <Image
      src={LOGO_SRC}
      width={width}
      height={size}
      alt="Lumen"
      unoptimized
      className={`block flex-shrink-0 object-contain ${className ?? ''}`}
      style={{ width, height: size }}
      draggable={false}
    />
  )
}
