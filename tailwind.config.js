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
        cal: ["'Cal Sans'", 'sans-serif'],
      },
      colors: {
        shiftly: {
          pink: 'var(--shiftly-pink)',
          'pink-light': 'var(--shiftly-pink-light)',
          'pink-dark': 'var(--shiftly-pink-dark)',
        },
      },
    },
  },
  plugins: [],
}