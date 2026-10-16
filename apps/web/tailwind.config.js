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
          cobalto: '#0F3078',       // Azul Cobalto mineral tradicional de Talavera
          cobaltoDark: '#0A1E4A',   // Tinta profunda de cobalto / horno
          cobaltoLight: '#1B49AC',  // Pincelada de plumilla viva
          aguada: '#3E6FD1',        // Aguada luminosa de cobalto
          celeste: '#DCE6F9',       // Lavado suave de cobalto
          lavanda: '#7B93C9',       // Media tinta azulada
          amarillo: '#D48914',      // Amarillo Nápoles / Ocre Talavera
          amarilloVivo: '#F0B43A',  // Ocre solar brillante
          terracota: '#B84A2C',     // Ladrillo de petatillo poblano / barro rojo
          terracotaLight: '#D66544',// Barro cocido luminoso
          verde: '#1D6B52',         // Verde cobre mineral Talavera
          malva: '#6D438A',         // Violeta de manganeso
          hierro: '#162035',        // Perfilado negro hierro de alfarero
          marfil: '#FAF6EE',        // Blanco estannífero / Esmalte Majólica
          crema: '#F2EBDC',         // Fondo cerámico cálido / cantera clara
          porcelana: '#FFFDF9',     // Brillo de esmalte puro
        },
        puebla: {
          talavera: '#0F3078',
          cobalto: '#1B49AC',
          terracota: '#B84A2C',
          cantera: '#E5DCCB',
          oro: '#D48914',
          verde: '#1D6B52',
          malva: '#6D438A',
          marfil: '#FAF6EE',
          hierro: '#162035'
        }
      }
    },
  },
  plugins: [],
}

