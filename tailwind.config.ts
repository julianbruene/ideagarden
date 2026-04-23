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
          // Warm paper palette
          bg: '#F6F1E8',            // page background — warm off-white
          surface: '#FDFBF6',       // cards, elevated surfaces
          border: '#E4DDCF',        // hairline warm gray-brown
          text: '#2A2620',          // body text — warm near-black
          muted: '#8B8070',         // secondary text
          'muted-soft': '#B5AC9E',  // very muted — dates, hints

          // Accent — forest green (Garden, primary action)
          accent: '#3F6B42',
          'accent-light': '#E8EFE4',
          'accent-dark': '#2F5332',

          // Seed — warm terracotta (Projects, done, maturation)
          seed: '#A8522A',
          'seed-light': '#F4E6DD',

          // Accents kept for continuity
          star: '#C79329',          // ochre for starred notes
          'star-light': '#FAF0D9',
          heart: '#B84A3E',         // rust-red for heart/idea-sex preselect
          'heart-light': '#F9E3DF',

          danger: '#B04848',
          'danger-light': '#F5E0DE',
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
