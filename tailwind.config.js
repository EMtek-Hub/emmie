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
        sans: ['Figtree', 'sans-serif'],
      },
      colors: {
        'emtek-navy': '#005b99',
        'emtek-blue': '#003087',
        'emtek-orange': '#ef730b',
        'emtek-green': '#2e7d32',
        'emtek-red': '#d32f2f',
        'emtek-purple': '#7b1fa2',
      },
    },
  },
  plugins: [],
}
