/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./src/**/*.{js,ts}", "./dist/**/*.js"],
  theme: {
    extend: {
      colors: {
        readwise: {
          DEFAULT: '#323e46',
          light: '#4a5860',
          dark: '#252d33',
          50: '#f5f6f7',
          100: '#e5e8ea'
        }
      }
    }
  },
  plugins: [],
}
