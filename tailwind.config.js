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
        sans: ['var(--font-figtree)', 'system-ui', '-apple-system', 'sans-serif'],
        cal: ["'Cal Sans'", 'system-ui', 'sans-serif'],
      },
      // Named type-scale roles (~1.25 ratio off 16px). Reference these (text-h1, text-body…)
      // instead of Tailwind's numeric defaults, which are off-scale (text-3xl is 30px, not 31).
      fontSize: {
        small: ['0.8rem', { lineHeight: '1.4' }],     // 13px
        body: ['1rem', { lineHeight: '1.5' }],         // 16px
        h3: ['1.25rem', { lineHeight: '1.3' }],        // 20px
        h2: ['1.563rem', { lineHeight: '1.3' }],       // 25px
        h1: ['1.953rem', { lineHeight: '1.15' }],      // 31px
        display: ['2.441rem', { lineHeight: '1.1' }],  // 39px
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