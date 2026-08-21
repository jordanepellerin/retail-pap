// Génère les VRAIES photos produit de public/produits/ avec Gemini.
//
// Le plus simple, une fois pour toutes (le fichier est déjà ignoré par git,
// cf. .gitignore : *.local) :
//
//     cp .env.example .env.local
//     # éditer .env.local, renseigner GOOGLE_API_KEY
//     npm run photos
//
// Ou en une ligne, si la variable d'env est déjà positionnée dans le shell :
//
//     GOOGLE_API_KEY=... npm run photos            # tout ce qui manque
//     GOOGLE_API_KEY=... npm run photos -- --force # régénère tout
//     GOOGLE_API_KEY=... npm run photos -- c1 v2   # seulement ces articles
//
// Elles remplacent les placeholders SVG sur la vitrine : `visuelArticle()`
// (src/data/catalogue.ts) sert `<slug>.jpg` dès qu'il existe, et retombe sur
// `<slug>.svg` sinon. Aucune modification de code n'est nécessaire après coup.
//
// Le prompt de CHAQUE photo est dérivé des métadonnées de l'article — famille,
// matière, couleur, coupe, description. L'image et sa fiche ne peuvent donc pas
// diverger : c'est la fiche qui décrit l'image.
//
// CHAQUE PIÈCE EST SEULE sur sa photo, et c'est délibéré : ce visuel est la
// référence de fidélité envoyée au modèle d'essayage (`visuelsPourRendu`), qui
// doit pouvoir isoler la pièce. Le mannequin portant la tenue complète est
// l'affaire de `generer-looks.mjs`, qui écrit un fichier distinct.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SORTIE,
  chargerEnvLocal,
  exigerCle,
  genererImage,
  lireCatalogue
} from './lib/commun.mjs'

chargerEnvLocal()

// ─────────────────────────────── Prompt photo

const COUPES = { slim: 'coupe ajustée', tailored: 'coupe tailored', regular: 'coupe droite' }

/**
 * Mise en scène par famille. Les pièces qui se lisent mal à plat (costume,
 * veste) sont portées ; les autres sont photographiées seules, ce qui rend
 * mieux la matière et la couleur.
 */
const MISE_EN_SCENE = {
  costume:
    "porté par un mannequin homme debout, cadré en pied, de face, bras le long du corps, sur un fond de studio uni beige clair",
  veste:
    "portée par un mannequin homme debout, cadré à mi-cuisse, de face, sur un fond de studio uni beige clair",
  chemise:
    "portée par un mannequin homme debout, cadré du haut des cuisses à la tête, de face, sur un fond de studio uni beige clair",
  pantalon:
    "porté par un mannequin homme debout, cadré de la taille aux chaussures, de face, sur un fond de studio uni beige clair",
  maille:
    "porté par un mannequin homme debout, cadré du bassin à la tête, de face, sur un fond de studio uni beige clair",
  chaussures:
    "photographiée seule, la paire posée au sol de trois quarts, sur un fond uni beige clair",
  accessoire: "photographié seul, posé à plat, cadré serré, sur un fond uni beige clair"
}

function construirePrompt(article) {
  const coupe = article.coupe ? `, ${COUPES[article.coupe] ?? article.coupe}` : ''
  const scene = MISE_EN_SCENE[article.categorie] ?? MISE_EN_SCENE.accessoire
  return `Photographie de mode e-commerce, haut de gamme, format portrait 3:4.

SUJET — c'est le seul vêtement de l'image, il doit être reproduit exactement :
${article.descriptionRendu}.
Matière : ${article.matiere}. Couleur : ${article.couleur}${coupe}.

MISE EN SCÈNE : ${scene}. Lumière de studio douce et diffuse, ombres portées légères, aucune ombre dure.

EXIGENCES :
- la couleur et la matière annoncées doivent être immédiatement reconnaissables — c'est le critère principal ;
- rendu réaliste du tissu : grain, tombé, plis naturels aux articulations ;
- image nette, sujet centré, entièrement dans le cadre, sans recadrage sur un détail ;
- fond uni et sobre, aucun décor, aucun accessoire non demandé, aucune autre personne.

CADRAGE — règles strictes, ce sont les deux erreurs les plus fréquentes :
- VUE DE FACE UNIQUEMENT. Le mannequin regarde l'objectif, on voit l'avant du vêtement : boutonnage, revers, col. Jamais de dos, jamais de profil, jamais de trois quarts arrière.
- La TÊTE ENTIÈRE du mannequin est dans le cadre, visage compris. Ne coupe jamais au niveau du cou ni du menton : soit la tête est entièrement visible, soit le cadrage démarre nettement sous les épaules.

INTERDITS : aucun logo, aucune marque, aucun texte, aucun filigrane, aucun cartouche de prix, aucun collage ni bordure.`
}

// ─────────────────────────────── Exécution

exigerCle('photos')

const args = process.argv.slice(2)
const force = args.includes('--force')
const idsVoulus = args.filter((a) => !a.startsWith('--'))

const catalogue = lireCatalogue()
const aFaire = catalogue.filter((a) => {
  if (idsVoulus.length > 0 && !idsVoulus.includes(a.id)) return false
  if (force) return true
  return !existsSync(join(SORTIE, `${a.slug}.jpg`))
})

if (aFaire.length === 0) {
  console.log(`Rien à générer (${catalogue.length} articles, toutes les photos existent déjà).`)
  console.log('Utiliser --force pour les régénérer.')
  process.exit(0)
}

mkdirSync(SORTIE, { recursive: true })
console.log(`${aFaire.length} photo(s) à générer sur ${catalogue.length} articles.\n`)

let reussites = 0
const echecs = []
for (const [i, article] of aFaire.entries()) {
  const etiquette = `[${i + 1}/${aFaire.length}] ${article.slug}`
  try {
    const { data, model } = await genererImage([{ text: construirePrompt(article) }])
    writeFileSync(join(SORTIE, `${article.slug}.jpg`), data)
    reussites += 1
    console.log(`${etiquette} — ${Math.round(data.length / 1024)} Ko via ${model}`)
  } catch (e) {
    echecs.push(article.slug)
    console.error(`${etiquette} — ÉCHEC : ${e instanceof Error ? e.message : e}`)
  }
}

console.log(`\n${reussites} photo(s) écrite(s) dans public/produits/.`)
if (echecs.length > 0) {
  console.log(`${echecs.length} échec(s) : ${echecs.join(', ')}`)
  console.log('Relancer la commande reprendra uniquement les manquantes.')
}
console.log('Vérifier le rendu, puis committer les .jpg — la vitrine bascule dessus toute seule.')
console.log('Les photos de pièce ayant changé, relancer `npm run looks -- --force` pour les looks.')
