/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['-apple-system','BlinkMacSystemFont','"Segoe UI"','"PingFang SC"','"Hiragino Sans GB"','"Microsoft YaHei"','Roboto','Helvetica','Arial','sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5eef7', 100: '#ebd3f0', 200: '#d4a6e0', 300: '#b87ac9',
          400: '#9b5ab0', 500: '#7c4296', 600: '#6b3a7d', 700: '#552f64',
          800: '#40244d', 900: '#2d1b4e',
        },
        rose: { 50: '#fdf2f4', 100: '#fce7eb', 200: '#f9ced8', 300: '#f4a6b8', 400: '#ec7490', 500: '#d84a6a', 600: '#b85a7a', 700: '#9a3d5a', 800: '#7e2f48', 900: '#68263b' },
        peach: { 400: '#d4847a', 500: '#c97064', 600: '#b85a4d' },
      },
    },
  },
  plugins: [],
}
