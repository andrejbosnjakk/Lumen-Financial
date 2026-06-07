import Link from 'next/link'
import { LumenLogo } from '@/components/Logo'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lumen-bg px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/"><LumenLogo size={32} /></Link>
          <Link href="/signup" className="text-sm text-lumen-muted hover:text-lumen-text transition-colors">
            ← Back to sign up
          </Link>
        </div>
        <div className="lumen-panel rounded-[24px] p-8 sm:p-12">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-lumen-muted">
          © {new Date().getFullYear()} Lumen. All rights reserved.
        </p>
      </div>
    </div>
  )
}
