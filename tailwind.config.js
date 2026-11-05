/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf1f3',
          100: '#f6dde2',
          500: '#b4546a',
          600: '#9c4358',
          700: '#7f3447',
        },
      },
      minHeight: { touch: '3rem' },
      minWidth: { touch: '3rem' },
    },
  },
  plugins: [],
};
