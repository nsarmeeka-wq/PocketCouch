/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070d',
          900: '#080b14',
          800: '#0d1220',
          700: '#131a2c',
          600: '#1b2438',
        },
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        lime: {
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
        },
        flame: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.25), 0 18px 60px -20px rgba(34,211,238,0.45)',
        card: '0 24px 60px -32px rgba(2, 8, 23, 0.85)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to right, rgba(148,163,184,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.09) 1px, transparent 1px)',
        'brand-gradient': 'linear-gradient(120deg, #22d3ee 0%, #34d399 45%, #a3e635 100%)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.15' },
          '50%': { transform: 'translate3d(14px,-22px,0) scale(1.15)', opacity: '0.6' },
          '100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.15' },
        },
        scanline: {
          '0%': { transform: 'translateY(-105%)' },
          '100%': { transform: 'translateY(105%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.9' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Split on purpose: opacity keeps its end state (`both`), the rise does
        // NOT fill forward. A persisted transform — even an identity matrix —
        // turns the animated element into the containing block for every
        // `position: fixed` descendant, which silently re-anchors page-level
        // fixed UI (modals, floating controls) to the content box and can leave
        // it off-screen and unreachable.
        'fade-up-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up-rise': {
          '0%': { transform: 'translateY(18px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        burst: {
          '0%': { transform: 'scale(0.4)', opacity: '0.9' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        drift: 'drift 9s ease-in-out infinite',
        scanline: 'scanline 2.6s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.24,0.6,0.35,1) infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'fade-up':
          'fade-up-in 0.55s cubic-bezier(0.22,1,0.36,1) both, fade-up-rise 0.55s cubic-bezier(0.22,1,0.36,1)',
        'spin-slow': 'spin-slow 14s linear infinite',
        burst: 'burst 0.8s ease-out forwards',
      },
    },
  },
  plugins: [],
};
