import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lumen: {
          bg:           'var(--lumen-bg)',
          surface:      'var(--lumen-surface)',
          'surface-2':  'var(--lumen-surface-2)',
          border:       'var(--lumen-border)',
          fill:         'var(--lumen-fill)',
          'fill-sm':    'var(--lumen-fill-sm)',
          accent:       'rgb(var(--lumen-accent-rgb) / <alpha-value>)',
          'accent-dim': 'rgb(var(--lumen-accent-dim-rgb) / <alpha-value>)',
          'accent-glow':'rgb(var(--lumen-accent-rgb) / 0.15)',
          text:         'rgb(var(--lumen-text-rgb) / <alpha-value>)',
          muted:        'rgb(var(--lumen-muted-rgb) / <alpha-value>)',
          success:      '#10B981',
          danger:       '#EF4444',
          warning:      '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'accent-glow': '0 0 24px rgb(var(--lumen-accent-rgb) / 0.08)',
        'accent-glow-sm': '0 0 10px rgb(var(--lumen-accent-rgb) / 0.14)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
