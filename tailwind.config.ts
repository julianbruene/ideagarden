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
          // Claude-style palette — neutral cream, desaturated, not buttery
          bg: '#EEEAE0',            // main bg — neutral warm off-white (was yellowish #F6F1E8)
          surface: '#FDFCF9',       // cards
          border: '#DDD8CB',        // hairline warm neutral gray
          text: '#1C1B17',          // crisper near-black
          muted: '#6F6B62',         // secondary text, more neutral gray
          'muted-soft': '#A19C92',  // dates, hints — soft stone gray

          // Accent — forest green (Garden, primary action)
          accent: '#3F6B42',
          'accent-light': '#E5EBDF',
          'accent-dark': '#2F5332',

          // Seed — Anthropic-style terracotta/coral (Projects, maturation)
          seed: '#CC785C',
          'seed-light': '#F5E4DC',

          // Ochre for stars, dialed back to muted gold
          star: '#B88538',
          'star-light': '#F5EBD4',

          // Rust-red for heart/idea-sex
          heart: '#B84A3E',
          'heart-light': '#F2DBD6',

          danger: '#A54848',
          'danger-light': '#F0DBD8',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter-tight)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          'var(--font-fraunces)',
          'ui-serif',
          'Georgia',
          '"Times New Roman"',
          'serif',
        ],
        // Display = Fraunces for titles and literary surfaces
        display: [
          'var(--font-fraunces)',
          'ui-serif',
          'Georgia',
          'serif',
        ],
      },
      boxShadow: {
        // Warm, subtle paper shadow
        paper: '0 1px 2px 0 rgba(42, 38, 32, 0.04), 0 1px 3px 0 rgba(42, 38, 32, 0.05)',
        'paper-lg': '0 4px 16px -2px rgba(42, 38, 32, 0.08), 0 2px 6px 0 rgba(42, 38, 32, 0.04)',
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
