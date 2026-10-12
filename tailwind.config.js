/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0b0c10',
          900: '#111318',
          850: '#171a21',
          800: '#1e222b',
          700: '#2b313d',
          600: '#3d4454',
        },
        brand: {
          neon: '#4ade80',     // 明るいネオングリーン
          accent: '#22c55e',   // アクセントグリーン
          dim: 'rgba(74, 222, 128, 0.15)',
        }
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      }
    },
  },
  plugins: [],
}
