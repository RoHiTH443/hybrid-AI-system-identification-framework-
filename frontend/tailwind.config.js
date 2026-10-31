/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#090d16', // Clean deep background
          900: '#0f172a', // Solid dark slate surface
          800: '#1e293b', // Card background
          700: '#334155', // Clean border
          600: '#475569', // Subtle divider
        },
        cyan: {
          400: '#38bdf8', // Clean Sky Blue
          500: '#0284c7', // Primary Sky Blue
          600: '#0369a1',
        },
        violet: {
          400: '#818cf8', // Indigo
          500: '#6366f1', // Primary Indigo
          600: '#4f46e5',
        },
        graphite: {
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        accent: {
          teal: '#06b6d4',
          cyan: '#38bdf8',
          violet: '#6366f1',
          amber: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
        'hero-gradient': "radial-gradient(ellipse at top, #1e293b 0%, #090d16 80%)",
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.25), 0 1px 2px -1px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'panel': '0 1px 3px 0 rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
