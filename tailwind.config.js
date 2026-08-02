/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité André Laurent : noir/blanc/gris chauds, un seul accent sable.
        // Toute valeur ajoutée ici doit l'être aussi dans src/index.css (:root).
        'noir-encre': '#0A0A0A',
        'blanc-pur': '#FFFFFF',
        sable: '#C2AD8C',
        'gris-clair': '#F4F2EF',
        'gris-texte': '#6B6B6B',
        'gris-bordure': '#E3E0DB',
        'rouge-solde': '#8B1E1E'
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        content: '1440px'
      }
    }
  },
  plugins: []
}
