/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité André Laurent — « encre & craie » : bleu-encre profond, blanc
        // craie chaud, accent bordeaux. C'est l'accord du vestiaire masculin
        // (costume marine, cravate grenadine) — délibérément à l'opposé du
        // registre noir/or d'une galerie.
        // Toute valeur ajoutée ici doit l'être aussi dans src/index.css (:root).
        encre: '#16202E',
        'encre-clair': '#24344A',
        craie: '#F4F1EA',
        blanc: '#FFFFFF',
        ardoise: '#5C6675',
        filet: '#DAD5CA',
        bordeaux: '#7B2D3B',
        'bordeaux-clair': '#9A414E'
      },
      fontFamily: {
        serif: ['Spectral', 'Georgia', 'serif'],
        sans: ['Archivo', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        content: '1440px'
      }
    }
  },
  plugins: []
}
