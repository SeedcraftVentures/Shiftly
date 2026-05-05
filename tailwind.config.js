/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        cal: ["'Cal Sans'", 'system-ui', 'sans-serif'],
      },
      colors: {
        pink: {
          50: '#FFF0F6',
          100: '#FFE4EE',
          200: '#FFD0E0',
          300: '#FFA8C7',
          400: '#FF6BA0',
          500: '#FF1F7D',
          600: '#E8126D',
          700: '#C20D5C',
          800: '#A10A4D',
          900: '#82083F',
        },
      },
    },
  },
  plugins: [],
}