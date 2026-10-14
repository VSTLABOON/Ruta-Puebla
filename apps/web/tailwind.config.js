/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        puebla: {
          talavera: '#0d3b66',
          terracota: '#d64933',
          cantera: '#e5d9c5',
          oro: '#d4af37',
          marfil: '#fbfbf2'
        }
      }
    },
  },
  plugins: [],
}
