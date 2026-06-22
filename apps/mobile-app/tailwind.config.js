/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0f4',
          100: '#dddde6',
          200: '#b8b8cc',
          300: '#8e8eaf',
          400: '#545470',
          500: '#1a1a2e',
          600: '#151527',
          700: '#111120',
          800: '#0d0d19',
          900: '#090912',
        },
        secondary: {
          50: '#eef1f7',
          100: '#d4dae8',
          200: '#a9b5d1',
          300: '#7d8fb9',
          400: '#4a6198',
          500: '#16213e',
          600: '#121b33',
        },
        tertiary: {
          50: '#fefaf4',
          100: '#fdf3e3',
          200: '#fbe5c2',
          300: '#f7d49a',
          400: '#f3c88b',
          500: '#efc07b',
          600: '#d4a35e',
          700: '#b08246',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
