/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lineGreen: '#85e249',
        lineBg: '#abc3ed',
      },
    },
  },
  plugins: [],
}
