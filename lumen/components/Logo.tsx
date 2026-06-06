interface StarProps {
  size?: number
  className?: string
}

export function LumenStar({ size = 32, className }: StarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block flex-shrink-0 ${className ?? ''}`}
      aria-hidden="true"
      style={{ width: size, height: size, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="lumen-star-top" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8C86FF" />
          <stop offset="0.5" stopColor="#5E56FF" />
          <stop offset="1" stopColor="#332BBE" />
        </linearGradient>
        <linearGradient id="lumen-star-side" x1="5" y1="32" x2="59" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#342DC2" />
          <stop offset="0.5" stopColor="#746DFF" />
          <stop offset="1" stopColor="#342DC2" />
        </linearGradient>
        <linearGradient id="lumen-star-rim" x1="18" y1="12" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B9B5FF" stopOpacity="0.92" />
          <stop offset="0.52" stopColor="#F7F6F2" stopOpacity="0.58" />
          <stop offset="1" stopColor="#5B53F2" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lumen-star-core" cx="50%" cy="50%" r="50%">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.34" stopColor="#F7F6F2" />
          <stop offset="0.72" stopColor="#A9A4FF" stopOpacity="0.76" />
          <stop offset="1" stopColor="#6C63FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d="M32 4C40.8 14.2 49.8 23.2 60 32H43.7C38.8 28.8 35.2 25.2 32 20.3V4Z" fill="url(#lumen-star-top)" />
      <path d="M60 32C49.8 40.8 40.8 49.8 32 60V43.7C35.2 38.8 38.8 35.2 43.7 32H60Z" fill="url(#lumen-star-side)" />
      <path d="M32 60C23.2 49.8 14.2 40.8 4 32H20.3C25.2 35.2 28.8 38.8 32 43.7V60Z" fill="url(#lumen-star-top)" />
      <path d="M4 32C14.2 23.2 23.2 14.2 32 4V20.3C28.8 25.2 25.2 28.8 20.3 32H4Z" fill="url(#lumen-star-side)" />
      <path d="M32 15.8C35.4 24.2 39.8 28.6 48.2 32C39.8 35.4 35.4 39.8 32 48.2C28.6 39.8 24.2 35.4 15.8 32C24.2 28.6 28.6 24.2 32 15.8Z" fill="url(#lumen-star-rim)" opacity="0.72" />
      <path d="M32 20.6C34.4 26.4 37.6 29.6 43.4 32C37.6 34.4 34.4 37.6 32 43.4C29.6 37.6 26.4 34.4 20.6 32C26.4 29.6 29.6 26.4 32 20.6Z" fill="url(#lumen-star-core)" />
    </svg>
  )
}

interface LogoProps {
  size?: number
  className?: string
  iconOnly?: boolean
  darkText?: boolean
}

export function LumenLogo({ size = 28, className, iconOnly = false, darkText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className ?? ''}`}>
      <LumenStar size={size} />
      {!iconOnly && (
        <span
          className={darkText ? 'text-lumen-bg' : 'text-lumen-text'}
          style={{
            fontWeight: 600,
            fontSize: Math.round(size * 0.86),
            lineHeight: 1,
          }}
        >
          Lumen
        </span>
      )}
    </div>
  )
}
