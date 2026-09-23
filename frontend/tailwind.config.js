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
        legal: {
          bg: '#080c14',
          surface: '#0d1322',
          card: '#12192c',
          border: '#1e293b',
          borderHover: '#334155',
          gold: '#f59e0b',
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { borderColor: 'rgba(6, 182, 212, 0.9)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' },
          '50%': { borderColor: 'rgba(99, 102, 241, 0.4)', boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
