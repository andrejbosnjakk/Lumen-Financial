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
          bg:           '#0D0F1A',
          surface:      '#141622',
          'surface-2':  '#1C1F2E',
          border:       '#252836',
          accent:       'rgb(var(--lumen-accent-rgb) / <alpha-value>)',
          'accent-dim': 'rgb(var(--lumen-accent-dim-rgb) / <alpha-value>)',
          'accent-glow':'rgb(var(--lumen-accent-rgb) / 0.15)',
          text:         '#F7F6F2',
          muted:        '#6B7280',
          success:      '#10B981',
          danger:       '#EF4444',
          warning:      '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'accent-glow': '0 0 40px rgb(var(--lumen-accent-rgb) / 0.14)',
        'accent-glow-sm': '0 0 16px rgb(var(--lumen-accent-rgb) / 0.24)',
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
