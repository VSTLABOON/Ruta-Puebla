/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        popogo: {
          cobalto: '#0E2C9C',       // Dominante Talavera clásico (~77%)
          cobaltoDark: '#0B228A',   // Tono profundo Talavera
          cobaltoLight: '#2544A7',  // Tono luminoso Talavera
          lavanda: '#9597C1',       // Detalles y sombras suaves
          amarillo: '#EDE28E',      // Acentos florales
          malva: '#7B5E86',         // Acento cálido
          crema: '#EFF1F8',         // Fondo crema blanco hielo
        },
        puebla: {
          talavera: '#0E2C9C',
          terracota: '#7B5E86',
          cantera: '#9597C1',
          oro: '#EDE28E',
          marfil: '#EFF1F8'
        }
      }
    },
  },
  plugins: [],
}
