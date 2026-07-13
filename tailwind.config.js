/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { serif: ['"Noto Serif SC"', 'serif'], sans: ['-apple-system','BlinkMacSystemFont','"Segoe UI"','"PingFang SC"','"Hiragino Sans GB"','"Microsoft YaHei"','Roboto','Helvetica','Arial','sans-serif'] },
      colors: { brand: { 50: '#f0faf6', 100: '#d8f3ea', 200: '#b4e7d6', 300: '#84d4bd', 400: '#54bd9f', 500: '#33a888', 600: '#259276', 700: '#1f7860', 800: '#1d5f4d', 900: '#1a4d3f' } },
      backdropBlur: { glass: '16px' },
    },
  },
  plugins: [],
}
