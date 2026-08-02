// Génère les visuels produits SVG de public/produits/ (+ le mannequin d'exemple).
//
//     node scripts/generer-visuels.mjs
//
// Ce sont des PLACEHOLDERS : silhouettes vectorielles stylisées, dans la vraie
// couleur et la vraie matière de chaque article, pour que la démo tourne sans
// dépendance externe. Pour un rendu IA convaincant, remplacer par de vraies
// photos produit (cf. public/produits/README.md).
//
// Un seul demi-vêtement est décrit : la symétrie est faite par SVG
// (`<use transform="translate(600,0) scale(-1,1)">`), donc pas de miroir à la main.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = join(RACINE, 'public', 'produits')

const W = 600
const H = 800
const FOND = '#F4F2EF'

// ─────────────────────────────── Matières (remplissages)

/**
 * Construit le `<defs>` et renvoie les deux remplissages à utiliser :
 * `clair` pour les panneaux de face, `sombre` pour les manches/dessous.
 */
function matiere(motif, clair, sombre) {
  const trames = {
    // Tissage visible : lin, tweed, maille — fines croisures claires/sombres.
    lin: (id, base) => `
    <pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="${base}"/>
      <path d="M0 0H8M0 4H8" stroke="#000" stroke-opacity="0.05" stroke-width="1"/>
      <path d="M2 0V8M6 0V8" stroke="#fff" stroke-opacity="0.10" stroke-width="1"/>
    </pattern>`,
    tweed: (id, base) => `
    <pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="${base}"/>
      <path d="M0 10L10 0M-2 2L2 -2M8 12L12 8" stroke="#fff" stroke-opacity="0.16" stroke-width="1.6"/>
      <path d="M0 0L10 10" stroke="#000" stroke-opacity="0.10" stroke-width="1.4"/>
    </pattern>`,
    maille: (id, base) => `
    <pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse">
      <rect width="9" height="9" fill="${base}"/>
      <path d="M4.5 0V9" stroke="#000" stroke-opacity="0.08" stroke-width="2"/>
      <path d="M0 0V9" stroke="#fff" stroke-opacity="0.10" stroke-width="2"/>
    </pattern>`,
    // Côtes larges du velours côtelé.
    cotele: (id, base) => `
    <pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="${base}"/>
      <path d="M3 0V12" stroke="#fff" stroke-opacity="0.13" stroke-width="3"/>
      <path d="M9 0V12" stroke="#000" stroke-opacity="0.13" stroke-width="3"/>
    </pattern>`,
    // Prince-de-Galles : fenêtre de carreaux sur fond chiné.
    carreaux: (id, base) => `
    <pattern id="${id}" width="44" height="44" patternUnits="userSpaceOnUse">
      <rect width="44" height="44" fill="${base}"/>
      <path d="M0 0H44M0 22H44" stroke="#000" stroke-opacity="0.13" stroke-width="1.4"/>
      <path d="M0 0V44M22 0V44" stroke="#000" stroke-opacity="0.13" stroke-width="1.4"/>
      <path d="M0 11H44M0 33H44" stroke="#fff" stroke-opacity="0.18" stroke-width="1"/>
      <path d="M11 0V44M33 0V44" stroke="#fff" stroke-opacity="0.18" stroke-width="1"/>
    </pattern>`
  }
  // Velours et satin : pas une trame mais un reflet — dégradé vertical.
  const reflets = {
    velours: (id, base, autre) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${autre}"/>
      <stop offset="42%" stop-color="${base}"/>
      <stop offset="58%" stop-color="${base}"/>
      <stop offset="100%" stop-color="${autre}"/>
    </linearGradient>`,
    satin: (id, base, autre) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0%" stop-color="${autre}"/>
      <stop offset="35%" stop-color="${base}"/>
      <stop offset="50%" stop-color="${eclaircir(base, 0.22)}"/>
      <stop offset="70%" stop-color="${base}"/>
      <stop offset="100%" stop-color="${autre}"/>
    </linearGradient>`
  }

  if (trames[motif]) {
    return {
      defs: trames[motif]('texC', clair) + trames[motif]('texS', sombre),
      clair: 'url(#texC)',
      sombre: 'url(#texS)'
    }
  }
  if (reflets[motif]) {
    return {
      defs:
        reflets[motif]('texC', clair, sombre) +
        reflets[motif]('texS', sombre, assombrir(sombre, 0.25)),
      clair: 'url(#texC)',
      sombre: 'url(#texS)'
    }
  }
  return { defs: '', clair, sombre }
}

function melanger(hex, vers, ratio) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (vers - v) * ratio)
  )
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
const eclaircir = (hex, r) => melanger(hex, 255, r)
const assombrir = (hex, r) => melanger(hex, 0, r)

// ─────────────────────────────── Gabarits de vêtements

/** Enveloppe un demi-vêtement et sa symétrie autour de x = 300. */
const symetrique = (contenu) =>
  `<g id="moitie">${contenu}</g><use href="#moitie" transform="translate(600,0) scale(-1,1)"/>`

/** Trait de séparation entre deux panneaux d'un même tissu (manche / corps). */
const CONTOUR = 'stroke="#000" stroke-opacity="0.10" stroke-width="2"'

function veste({ clair, sombre, accent, boutons = 2, revers = 'crantes' }) {
  const manche = `<path d="M184 190 L106 212 C96 215 90 225 92 235 L116 468 C117 480 128 487 139 485 L200 475 C211 473 217 464 215 454 L196 232 Z" fill="${sombre}" ${CONTOUR}/>`
  const corps = `<path d="M300 150 C276 150 258 157 246 168 L186 196 C178 200 174 208 175 217 L190 340 L184 606 C184 613 189 618 196 618 L300 618 Z" fill="${clair}" ${CONTOUR}/>`
  const poche = `<path d="M204 452 L266 441 L268 456 L206 467 Z" fill="${accent}" opacity="0.5"/>`
  // Ouverture en V laissant voir la chemise, puis les deux revers par-dessus.
  const ouverture = `<path d="M300 150 L256 168 L300 352 L344 168 Z" fill="#EFEDE7"/>`
  const largeurRevers = revers === 'chale' ? 34 : 24
  const lapels = `
    <path d="M300 150 L256 168 L${300 - largeurRevers} 306 L300 262 Z" fill="${accent}"/>
    <path d="M300 150 L344 168 L${300 + largeurRevers} 306 L300 262 Z" fill="${accent}"/>`
  const rangee = Array.from(
    { length: boutons },
    (_, i) => `<circle cx="300" cy="${356 + i * 52}" r="7" fill="${assombrir(accent, 0.35)}"/>`
  ).join('')
  const couture = `<path d="M300 352 V618" stroke="#000" stroke-opacity="0.12" stroke-width="1.5"/>`
  return symetrique(manche + corps + poche) + ouverture + lapels + couture + rangee
}

function pantalon({ clair, sombre, sombreHex, galon = false }) {
  const ceinture = `<path d="M300 168 L200 168 L200 202 L300 202 Z" fill="${sombre}" ${CONTOUR}/>`
  const jambe = `<path d="M300 202 L200 202 L193 642 C192 652 198 658 208 658 L266 658 C275 658 281 652 282 643 L300 300 Z" fill="${clair}" ${CONTOUR}/>`
  const pli = `<path d="M243 210 V652" stroke="#fff" stroke-opacity="0.20" stroke-width="2"/>`
  // Galon de satin du smoking, le long de la couture latérale.
  const bande = galon
    ? `<path d="M196 204 L189 650" stroke="${eclaircir(sombreHex, 0.45)}" stroke-width="7"/>`
    : ''
  return (
    symetrique(jambe + ceinture + pli + bande) +
    `<path d="M300 202 V300" stroke="#000" stroke-opacity="0.14" stroke-width="2"/>`
  )
}

function chemise({ clair, sombre, accent, plastron = false }) {
  const manche = `<path d="M194 202 L124 224 C115 227 110 237 112 246 L134 462 C135 473 146 480 157 478 L212 468 C223 466 229 457 227 447 L208 240 Z" fill="${sombre}" ${CONTOUR}/>`
  const corps = `<path d="M300 176 C280 176 264 182 254 190 L196 206 C189 209 186 216 187 224 L200 330 L196 600 C196 607 201 612 208 612 L300 612 Z" fill="${clair}" ${CONTOUR}/>`
  const col = `<path d="M300 158 L254 174 L268 218 L300 190 Z" fill="${sombre}" ${CONTOUR}/>`
  const zonePlastron = plastron
    ? `<rect x="256" y="206" width="88" height="176" rx="4" fill="#FFFFFF" stroke="#000" stroke-opacity="0.10"/>
       <path d="M266 226H334M266 250H334M266 274H334M266 298H334M266 322H334M266 346H334" stroke="#000" stroke-opacity="0.07" stroke-width="3"/>`
    : ''
  const patte = `<rect x="290" y="188" width="20" height="424" fill="${accent}" opacity="0.35"/>`
  const boutons = Array.from(
    { length: 7 },
    (_, i) => `<circle cx="300" cy="${232 + i * 56}" r="4.5" fill="#000" fill-opacity="0.2"/>`
  ).join('')
  return symetrique(manche + corps + col) + patte + zonePlastron + boutons
}

function maille({ clair, sombre, accent, manches = 'longues', col = 'rond' }) {
  const sansManches = manches === 'aucune'
  const courtes = manches === 'courtes'
  const manche = sansManches
    ? ''
    : courtes
      ? `<path d="M190 196 L126 222 C117 226 111 236 113 245 L128 330 C130 341 142 348 153 345 L212 328 C223 325 229 315 227 306 L204 236 Z" fill="${sombre}" ${CONTOUR}/>`
      : `<path d="M190 196 L112 224 C102 228 96 238 98 248 L122 466 C123 478 135 485 146 483 L206 472 C217 470 223 461 221 451 L204 236 Z" fill="${sombre}" ${CONTOUR}/>`
  const debutCorps = sansManches ? 218 : 190
  const corps = `<path d="M300 168 C272 168 250 176 236 188 L${debutCorps} 202 C${debutCorps - 8} 206 ${debutCorps - 12} 214 ${debutCorps - 10} 223 L${debutCorps + 6} 340 L${debutCorps + 2} 596 C${debutCorps + 2} 604 ${debutCorps + 8} 610 ${debutCorps + 16} 610 L300 610 Z" fill="${clair}" ${CONTOUR}/>`
  const cotes = `<rect x="${debutCorps + 2}" y="578" width="${300 - debutCorps - 2}" height="32" fill="${accent}" opacity="0.45"/>`
  const encolure =
    col === 'rond'
      ? `<path d="M256 172 C266 200 334 200 344 172 C330 158 270 158 256 172 Z" fill="${FOND}"/>
         <path d="M256 172 C266 200 334 200 344 172" stroke="${accent}" stroke-width="9" fill="none"/>`
      : col === 'v'
        ? `<path d="M254 170 L300 268 L346 170 Z" fill="${FOND}"/>
           <path d="M254 170 L300 268 L346 170" stroke="${accent}" stroke-width="9" fill="none"/>`
        : // Polo : patte boutonnée centrale, deux pointes de col rabattues vers l'extérieur.
          `<path d="M280 178 L320 178 L320 272 L300 282 L280 272 Z" fill="#FFFFFF" stroke="#000" stroke-opacity="0.08"/>
           <path d="M282 176 L240 194 L278 230 L302 194 Z" fill="${accent}"/>
           <path d="M318 176 L360 194 L322 230 L298 194 Z" fill="${accent}"/>
           <circle cx="300" cy="206" r="5" fill="#000" fill-opacity="0.2"/>
           <circle cx="300" cy="244" r="5" fill="#000" fill-opacity="0.2"/>`
  return symetrique(manche + corps + cotes) + encolure
}

/**
 * Profil de chaussure, pointe à droite. `sneaker` abaisse la tige et épaissit
 * la semelle ; `lacets` bascule entre œillets lacés et dessus lisse (mocassin).
 */
function chaussure({ clair, sombre, accent, sombreHex, lacets = true, sneaker = false }) {
  // `col` = sommet du contrefort arrière ; une sneaker est nettement plus basse.
  const col = sneaker ? 452 : 420
  // Tige entière d'abord, puis le quartier arrière par-dessus : c'est la
  // frontière entre les deux qui donne à la silhouette sa lecture de chaussure.
  const tige = `<path d="M104 546 L104 ${col + 48}
      C104 ${col + 22} 120 ${col + 6} 146 ${col}
      C174 ${col - 7} 202 ${col - 4} 222 ${col + 5}
      C231 ${col + 9} 235 ${col + 18} 233 ${col + 29}
      C229 ${col + 51} 239 ${col + 67} 259 ${col + 77}
      C305 ${col + 99} 374 ${col + 110} 442 ${col + 114}
      C470 ${col + 116} 492 ${col + 120} 506 ${col + 124}
      L106 548 Z" fill="${clair}" ${CONTOUR}/>`
  const quartier = `<path d="M104 546 L104 ${col + 48}
      C104 ${col + 22} 120 ${col + 6} 146 ${col}
      C174 ${col - 7} 202 ${col - 4} 222 ${col + 5}
      C231 ${col + 9} 235 ${col + 18} 233 ${col + 29}
      L246 547 Z" fill="${sombre}" ${CONTOUR}/>`
  const bout = sneaker
    ? `<path d="M430 ${col + 110} C462 ${col + 114} 490 ${col + 120} 506 ${col + 124} L428 546 Z" fill="${eclaircir(sombreHex, 0.5)}" stroke="#000" stroke-opacity="0.10"/>`
    : `<path d="M418 ${col + 108} C452 ${col + 114} 486 ${col + 120} 506 ${col + 124} L414 546 Z" fill="${sombre}" opacity="0.5"/>`
  const semelle = sneaker
    ? // Semelle épaisse et blanche, débordante à l'avant.
      `<path d="M96 542 L508 538 C524 538 534 548 534 560 C534 574 522 582 506 582 L112 586 C98 586 88 576 88 562 L88 552 C88 546 90 542 96 542 Z" fill="#F2F1ED" stroke="#000" stroke-opacity="0.14"/>
       <path d="M92 566 H532" stroke="#000" stroke-opacity="0.10" stroke-width="3"/>`
    : // Semelle fine cousue + talon empilé à l'arrière.
      `<path d="M100 542 L506 538 C518 538 524 544 524 552 C524 560 517 566 507 566 L114 570 C104 570 96 564 96 556 L96 548 C96 544 96 542 100 542 Z" fill="${assombrir(sombreHex, 0.35)}"/>
       <path d="M98 564 L180 561 L182 598 C182 604 178 608 172 608 L108 608 C102 608 98 604 98 598 Z" fill="${assombrir(sombreHex, 0.5)}"/>`
  const attaches = lacets
    ? // Languette au creux du cou-de-pied, puis trois rangs de laçage.
      `<path d="M228 ${col + 12} C246 ${col + 36} 250 ${col + 74} 246 546 L228 546 C232 ${col + 74} 226 ${col + 38} 214 ${col + 16} Z" fill="${eclaircir(sombreHex, 0.28)}"/>
       <path d="M206 ${col + 26} H262M204 ${col + 54} H264M206 ${col + 82} H262" stroke="${accent}" stroke-width="9" stroke-linecap="round" opacity="0.9"/>`
    : // Mocassin : couture en U sur le dessus, pas de laçage.
      `<path d="M262 ${col + 44} C300 ${col + 26} 350 ${col + 40} 388 ${col + 78}" stroke="#000" stroke-opacity="0.20" stroke-width="3" fill="none"/>
       <path d="M266 ${col + 58} C302 ${col + 42} 348 ${col + 56} 382 ${col + 90}" stroke="#fff" stroke-opacity="0.22" stroke-width="3" fill="none"/>`
  return tige + quartier + attaches + bout + semelle
}

function cravate({ clair, sombre, accent }) {
  return `
    <path d="M280 200 L320 200 L342 540 L300 616 L258 540 Z" fill="${clair}"/>
    <path d="M300 200 L320 200 L342 540 L300 616 Z" fill="${sombre}" opacity="0.35"/>
    <path d="M288 148 L312 148 L324 196 L300 216 L276 196 Z" fill="${accent}"/>
    <path d="M288 148 L276 196 L300 216 Z" fill="#000" fill-opacity="0.12"/>`
}

function noeud({ clair, sombre, accent }) {
  const aile = `<path d="M296 328 L206 292 C195 288 184 296 184 308 L184 392 C184 404 195 412 206 408 L296 372 Z" fill="${clair}"/>`
  return (
    symetrique(aile) +
    `<path d="M296 328 L206 292 C195 288 184 296 184 308 L184 350 L296 350 Z" fill="${sombre}" opacity="0.3"/>
     <rect x="282" y="318" width="36" height="64" rx="8" fill="${accent}"/>`
  )
}

/**
 * Pochette à trois pointes, montrée dans une poche poitrine : sans le panneau
 * de veste derrière, une pochette blanche sur fond clair serait invisible.
 */
function pochette({ clair, sombre, accent }) {
  const veste = '#3A3F49'
  return `
    <path d="M120 400 L480 400 L480 640 L120 640 Z" fill="${veste}"/>
    <path d="M200 452 L236 356 L272 452 Z" fill="${clair}" ${CONTOUR}/>
    <path d="M328 452 L364 356 L400 452 Z" fill="${clair}" ${CONTOUR}/>
    <path d="M264 452 L300 330 L336 452 Z" fill="${clair}" ${CONTOUR}/>
    <path d="M188 448 L412 448 L412 470 L188 470 Z" fill="${clair}" ${CONTOUR}/>
    <path d="M150 462 L450 462 L450 640 L150 640 Z" fill="${assombrir(veste, 0.25)}"/>
    <path d="M150 462 L450 462" stroke="#000" stroke-opacity="0.35" stroke-width="4"/>
    <path d="M196 356 L200 452M404 356 L400 452" stroke="${sombre}" stroke-opacity="0.4" stroke-width="2"/>
    <path d="M300 330 L300 452" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>`
}

function ceinture({ clair, sombre, accent }) {
  return `
    <path d="M110 372 L120 348 L430 348 L430 452 L120 452 L110 428 Z" fill="${clair}"/>
    <path d="M120 348 L430 348 L430 372 L120 372 Z" fill="${sombre}" opacity="0.4"/>
    <circle cx="160" cy="400" r="7" fill="${FOND}"/>
    <circle cx="196" cy="400" r="7" fill="${FOND}"/>
    <circle cx="232" cy="400" r="7" fill="${FOND}"/>
    <rect x="424" y="332" width="92" height="136" rx="10" fill="none" stroke="${accent}" stroke-width="14"/>
    <path d="M470 348 L470 452" stroke="${accent}" stroke-width="10"/>`
}

/** Costume : la veste et le pantalon côte à côte, comme une planche produit. */
function costume(params) {
  return `
    <g transform="translate(-24,54) scale(0.62)">${veste(params)}</g>
    <g transform="translate(276,54) scale(0.62)">${pantalon(params)}</g>`
}

const GABARITS = { veste, pantalon, chemise, maille, chaussure, cravate, noeud, pochette, ceinture, costume }

// ─────────────────────────────── Catalogue visuel
// (slug, gabarit, couleur claire, couleur sombre, matière, options)

const VISUELS = [
  ['costume-laine-marine', 'costume', '#2C3A55', '#1F2A3E', 'uni', {}],
  ['costume-laine-gris', 'costume', '#A8A9AD', '#8B8D92', 'uni', {}],
  ['costume-lin-beige', 'costume', '#D8C7A6', '#BFAD8B', 'lin', {}],
  ['costume-lin-vert', 'costume', '#8B8B5E', '#70714A', 'lin', {}],
  ['costume-flanelle-anthracite', 'costume', '#55575C', '#3F4146', 'uni', {}],
  ['costume-carreaux-prince-de-galles', 'costume', '#9A9186', '#7C746A', 'carreaux', {}],
  ['smoking-noir', 'costume', '#23242A', '#141519', 'satin', { boutons: 1, revers: 'chale', galon: true }],
  ['costume-velours-bleu-nuit', 'costume', '#2A2F4A', '#1B2035', 'velours', { boutons: 1 }],

  ['veste-lin-bleu', 'veste', '#9EB6CC', '#82A0BA', 'lin', {}],
  ['blazer-laine-marine', 'veste', '#2E3C58', '#1F2A3F', 'uni', {}],
  ['veste-lin-rose', 'veste', '#E4C2BC', '#C9A29B', 'lin', {}],
  ['veste-tweed-brun', 'veste', '#8A7458', '#6C5A42', 'tweed', { boutons: 3 }],
  ['veste-velours-vert', 'veste', '#2F4A3A', '#1E3125', 'velours', { boutons: 1, revers: 'chale' }],

  ['pantalon-flanelle-gris', 'pantalon', '#56585D', '#3F4145', 'uni', {}],
  ['chino-coton-beige', 'pantalon', '#CBB894', '#AE9B78', 'uni', {}],
  ['pantalon-lin-ecru', 'pantalon', '#E4DAC6', '#C9BEA6', 'lin', {}],
  ['pantalon-laine-marine', 'pantalon', '#303E59', '#212C41', 'uni', {}],
  ['pantalon-velours-cotele-brun', 'pantalon', '#8A6A45', '#6B5133', 'cotele', {}],

  ['chemise-popeline-blanche', 'chemise', '#FFFFFF', '#E9E9E9', 'uni', {}],
  ['chemise-popeline-bleu-ciel', 'chemise', '#C3D8EA', '#A8C3D9', 'uni', {}],
  ['chemise-oxford-blanche', 'chemise', '#F6F5F1', '#E0DED7', 'lin', {}],
  ['chemise-lin-blanche', 'chemise', '#FAF6EE', '#E4DED0', 'lin', {}],
  ['chemise-lin-bleu', 'chemise', '#7C93AB', '#657C93', 'lin', {}],
  ['chemise-smoking-plastron', 'chemise', '#FFFFFF', '#EAEAEA', 'uni', { plastron: true }],

  ['pull-merinos-marine', 'maille', '#2F3D57', '#212B3E', 'maille', { col: 'rond' }],
  ['gilet-maille-gris', 'maille', '#B4B6BA', '#9A9CA1', 'maille', { manches: 'aucune', col: 'v' }],
  ['polo-maille-ecru', 'maille', '#EDE4D2', '#D5CBB5', 'maille', { manches: 'courtes', col: 'polo' }],

  ['derby-cuir-noir', 'chaussure', '#2A2A2C', '#1A1A1C', 'uni', {}],
  ['oxford-cuir-brun', 'chaussure', '#7A4B32', '#5B3722', 'uni', {}],
  ['mocassin-daim-taupe', 'chaussure', '#A3907A', '#83725E', 'maille', { lacets: false }],
  ['sneaker-cuir-blanc', 'chaussure', '#FFFFFF', '#E2E2E2', 'uni', { sneaker: true, lacets: true }],

  ['cravate-grenadine-marine', 'cravate', '#2C3A55', '#1F2A3E', 'maille', {}],
  ['cravate-laine-bordeaux', 'cravate', '#6E2732', '#511C25', 'tweed', {}],
  ['noeud-papillon-soie-noir', 'noeud', '#26262A', '#161618', 'satin', {}],
  ['pochette-lin-blanche', 'pochette', '#FDFBF6', '#E6E1D5', 'lin', {}],
  ['ceinture-cuir-brun', 'ceinture', '#7A5334', '#5A3C24', 'uni', {}],
  ['ceinture-cuir-noir', 'ceinture', '#2B2B2D', '#17171A', 'uni', {}]
]

function document(slug, gabarit, clairHex, sombreHex, motif, options) {
  // `clair`/`sombre` peuvent être des `url(#…)` (trame ou dégradé) : toute
  // couleur DÉRIVÉE doit partir des hex bruts, jamais de ces remplissages.
  const { defs, clair, sombre } = matiere(motif, clairHex, sombreHex)
  const accent = assombrir(sombreHex, 0.2)
  const contenu = GABARITS[gabarit]({ clair, sombre, accent, clairHex, sombreHex, ...options })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${slug}">
  <defs>${defs}
    <filter id="ombre" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.13"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${FOND}"/>
  <g filter="url(#ombre)">${contenu}</g>
</svg>
`
}

// Mannequin d'exemple pour l'étape photo (silhouette neutre, aucun visage).
const MANNEQUIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800" role="img" aria-label="Mannequin d'exemple">
  <defs>
    <linearGradient id="mur" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EDEAE4"/>
      <stop offset="100%" stop-color="#DAD5CC"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#mur)"/>
  <rect y="690" width="600" height="110" fill="#C9C2B6"/>
  <ellipse cx="300" cy="706" rx="120" ry="16" fill="#000" fill-opacity="0.10"/>
  <g fill="#8E8577">
    <circle cx="300" cy="128" r="52"/>
    <path d="M300 186 C258 186 232 200 220 226 L196 330 C193 344 202 356 216 358 L232 360 L226 512 C225 524 234 534 246 534 L354 534 C366 534 375 524 374 512 L368 360 L384 358 C398 356 407 344 404 330 L380 226 C368 200 342 186 300 186 Z"/>
    <path d="M252 534 L246 690 C245 700 252 706 262 706 L288 706 C297 706 303 700 303 691 L300 560 L297 691 C297 700 303 706 312 706 L338 706 C348 706 355 700 354 690 L348 534 Z"/>
  </g>
</svg>
`

mkdirSync(SORTIE, { recursive: true })
for (const [slug, gabarit, clair, sombre, motif, options] of VISUELS) {
  writeFileSync(join(SORTIE, `${slug}.svg`), document(slug, gabarit, clair, sombre, motif, options))
}
mkdirSync(join(RACINE, 'public', 'exemples'), { recursive: true })
writeFileSync(join(RACINE, 'public', 'exemples', 'mannequin.svg'), MANNEQUIN)
console.log(`${VISUELS.length} visuels produits générés dans public/produits/ + 1 mannequin d'exemple.`)
