import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lumen - Personal finance dashboard',
  description: 'Import, categorize, and review your bank transactions.',
  icons: { icon: '/brand/lumen-symbol-pixel-faithful.png' },
}

const themeInitScript = `
(() => {
  try {
    const root = document.documentElement;
    const theme = localStorage.getItem('lumen-theme');
    const mode = localStorage.getItem('lumen-mode');

    if (theme === 'green' || theme === 'amber') {
      root.dataset.theme = theme;
    } else {
      root.removeAttribute('data-theme');
    }

    if (mode === 'light') {
      root.dataset.mode = 'light';
    } else {
      root.removeAttribute('data-mode');
    }
  } catch (_) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
