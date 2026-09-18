/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#FF6B35',
          glow: '#FF7F50',
          deep: '#E85D04',
        },
        gold: {
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          DEFAULT: '#FFB703',
          warm: '#E5A93C',
          bright: '#F6BD60',
        },
        royal: {
          900: '#070C1B',
          800: '#0B132B',
          700: '#1C2541',
          600: '#1D3557',
          500: '#2A4365',
          DEFAULT: '#0B132B',
        },
        maroon: {
          DEFAULT: '#7B1E28',
          dark: '#541018',
        },
        cream: {
          50: '#FFFEFA',
          100: '#FDFBF7',
          200: '#F6F2EA',
          300: '#EDE4D4',
          DEFAULT: '#FDFBF7',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Merriweather', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mandala-pattern': "radial-gradient(circle, rgba(255,183,3,0.08) 1px, transparent 1px)",
        'heritage-gradient': "linear-gradient(135deg, #070C1B 0%, #0B132B 50%, #1C2541 100%)",
        'saffron-gold': "linear-gradient(135deg, #FF6B35 0%, #FFB703 100%)",
        'royal-gold': "linear-gradient(135deg, #0B132B 0%, #1D3557 60%, #E5A93C 100%)",
      },
      animation: {
        'scan-laser': 'scan 2.5s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.8' },
          '50%': { transform: 'translateY(95%)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
