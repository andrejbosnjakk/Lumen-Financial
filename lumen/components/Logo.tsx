import Image from 'next/image'

const LOGO_SRC = '/brand/lumen-logo.png'
// Intrinsic dimensions of the new logo
const LOGO_W = 2508
const LOGO_H = 627
const LOGO_ASPECT = LOGO_W / LOGO_H // ≈ 4.0

interface StarProps {
  size?: number
  className?: string
}

// Shows only the icon (left square portion) of the logo
export function LumenStar({ size = 32, className }: StarProps) {
  const fullWidth = Math.round(size * LOGO_ASPECT)
  return (
    <div
      className={`flex-shrink-0 overflow-hidden ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={LOGO_SRC}
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
      draggable={false}
      className={`block flex-shrink-0 ${className ?? ''}`}
      style={{ width, height: size }}
    />
  )
}
