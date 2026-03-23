/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
  ],
  theme: {
      extend: {
          fontFamily: {
              sans: ['Manrope', 'sans-serif'],
          },
      },
  },
  plugins: [],
}