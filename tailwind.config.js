/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'noir-bartoux': '#0A0A0A',
        'blanc-bartoux': '#FFFFFF',
        'or-bartoux': '#C9A96E',
        'gris-clair': '#F5F5F5',
        'gris-texte': '#6B6B6B',
        'gris-bordure': '#E0E0E0',
        'rouge-accent': '#8B0000'
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        content: '1280px'
      }
    }
  },
  plugins: []
}
