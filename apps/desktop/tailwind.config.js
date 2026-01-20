/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
    "./src/renderer/index.html",
  ],
  theme: {
    extend: {
      colors: {
        rim: {
          bg: '#1a1a1a',
          panel: '#242424',
          border: '#3a3a3a',
          text: '#e0e0e0',
          muted: '#808080',
          accent: '#4a9eff',
          success: '#4ade80',
          warning: '#fbbf24',
          error: '#ef4444',
          working: '#4ade80',
          idle: '#6b7280',
          pushing: '#8b5cf6',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-small': 'bounce-small 0.6s infinite',
        'shake': 'shake 0.5s infinite',
      },
      keyframes: {
        'bounce-small': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
      },
    },
  },
  plugins: [],
}
