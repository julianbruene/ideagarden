import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        garden: {
          // Paper palette — single coral accent
          bg: '#FAF8F4',            // page background — warm paper
          surface: '#FFFFFF',       // cards, elevated
          border: '#E8E3D8',        // hairline (alias)
          hairline: '#E8E3D8',      // primary divider
          'hairline-soft': '#F0EDE4', // softer divider

          text: '#1B1A17',          // ink
          ink: '#1B1A17',           // alias
          'ink-soft': '#4A4843',
          muted: '#837F76',         // stone (secondary text)
          'muted-soft': '#B6B0A4',  // dates, hints

          // SINGLE accent — coral. Replaces former accent / seed / heart / star.
          accent: '#E6734E',
          'accent-light': '#FBEDE5',  // alias for hover/highlight
          'accent-soft': '#FBEDE5',
          'accent-deep': '#C95A38',
          'accent-dark': '#C95A38',   // alias kept for legacy refs

          // Legacy aliases kept so older class refs still resolve to coral
          seed: '#E6734E',
          'seed-light': '#FBEDE5',
          star: '#E6734E',
          'star-light': '#FBEDE5',
          heart: '#E6734E',
          'heart-light': '#FBEDE5',

          danger: '#A6452F',
          'danger-light': '#F0E2DA',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        // Display = Newsreader (Editorial serif)
        display: [
          'var(--font-newsreader)',
          'Newsreader',
          'Georgia',
          '"Times New Roman"',
          'serif',
        ],
        serif: [
          'var(--font-newsreader)',
          'Newsreader',
          'Georgia',
          '"Times New Roman"',
          'serif',
        ],
        mono: [
          'var(--font-jetbrains-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        'micro': ['10px', { letterSpacing: '0.16em', lineHeight: '1' }],
      },
      boxShadow: {
        paper: '0 1px 2px 0 rgba(27,26,23,0.04), 0 1px 3px 0 rgba(27,26,23,0.05)',
        'paper-lg': '0 8px 24px -8px rgba(27,26,23,0.12), 0 2px 6px -2px rgba(27,26,23,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
