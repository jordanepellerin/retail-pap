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

import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─────────────────────────────── .env.local
// Lu manuellement (pas de dépendance dotenv) : une variable déjà présente dans
// le shell (CI, export préalable) garde toujours la priorité sur le fichier.
function chargerEnvLocal() {
  const chemin = join(RACINE, '.env.local')
  if (!existsSync(chemin)) return
  for (const ligne of readFileSync(chemin, 'utf-8').split('\n')) {
    const l = ligne.trim()
    if (!l || l.startsWith('#')) continue
    const i = l.indexOf('=')
    if (i < 0) continue
    const cle = l.slice(0, i).trim()
    let valeur = l.slice(i + 1).trim()
    if (
      (valeur.startsWith('"') && valeur.endsWith('"')) ||
      (valeur.startsWith("'") && valeur.endsWith("'"))
    ) {
      valeur = valeur.slice(1, -1)
    }
    if (cle && !(cle in process.env)) process.env[cle] = valeur
  }
}
chargerEnvLocal()
const SORTIE = join(RACINE, 'public', 'produits')

// Ordre de préférence, comme côté serveur : on ne parie pas sur un identifiant.
const MODELES = (process.env.RENDER_MODEL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(['gemini-3-pro-image', 'gemini-3-pro-image-preview', 'gemini-2.5-flash-image'])

// ─────────────────────────────── Lecture du catalogue
// Le catalogue est en TypeScript ; plutôt que d'ajouter un transpileur pour un
// script ponctuel, on en extrait les champs utiles par analyse de texte. Le
// format des entrées est stable et vérifié ci-dessous (un article incomplet
// interrompt le script au lieu de produire une image fausse).

function lireCatalogue() {
  // Normalisé en \n : sous Windows, git checkout out en CRLF (\r\n) selon la
  // config locale (core.autocrlf), et les motifs ci-dessous cherchent des \n
  // littéraux — sans cette normalisation, aucun article n'est trouvé.
  const source = readFileSync(join(RACINE, 'src', 'data', 'catalogue.ts'), 'utf-8').replace(
    /\r\n/g,
    '\n'
  )
  const debut = source.indexOf('export const CATALOGUE')
  const fin = source.indexOf('\n]', debut)
  if (debut < 0 || fin < 0) throw new Error('CATALOGUE introuvable dans catalogue.ts')
  const corps = source.slice(debut, fin)

  const articles = []
  for (const bloc of corps.split(/\n  \{\n/).slice(1)) {
    const champ = (nom) =>
      new RegExp(`\\n?\\s*${nom}:\\s*(?:\\n\\s*)?'((?:[^'\\\\]|\\\\.)*)'`).exec(bloc)?.[1] ?? null
    const nombre = (nom) => {
      const v = new RegExp(`\\n\\s*${nom}: (\\d+)`).exec(bloc)?.[1]
      return v ? Number(v) : null
    }
    const article = {
      id: champ('id'),
      nom: champ('nom'),
      categorie: champ('categorie'),
      matiere: champ('matiere'),
      couleur: champ('couleur'),
      coupe: champ('coupe'),
      prix: nombre('prix'),
      image: champ('image'),
      descriptionRendu: champ('descriptionRendu')
    }
    if (!article.id || !article.image || !article.descriptionRendu) {
      throw new Error(`Article incomplet dans catalogue.ts : ${JSON.stringify(article)}`)
    }
    article.slug = article.image.replace('/produits/', '').replace('.svg', '')
    articles.push(article)
  }
  if (articles.length === 0) throw new Error('Aucun article lu depuis catalogue.ts')
  return articles
}

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

// ─────────────────────────────── Génération

// Contrôlé AVANT toute construction du SDK, qui avertit de lui-même si la clé
// manque — l'utilisateur mérite un seul message, et le bon.
if (!process.env.GOOGLE_API_KEY) {
  console.error(
    'GOOGLE_API_KEY absente.\n\n' +
      'Le plus simple :\n' +
      '  cp .env.example .env.local\n' +
      '  # éditer .env.local, renseigner GOOGLE_API_KEY=votre_cle\n' +
      '  npm run photos\n\n' +
      'Ou en une ligne :\n' +
      '  GOOGLE_API_KEY=votre_cle npm run photos\n\n' +
      'La clé se récupère sur https://aistudio.google.com/apikey — la même que celle du projet Vercel.'
  )
  process.exit(1)
}

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })

function modeleIndisponible(err) {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return /404|403|429|500|503|not found|not supported|permission|denied|quota|exhausted|overloaded|unavailable/.test(
    msg
  )
}

async function genererImage(prompt) {
  let derniere = new Error('aucun modèle candidat')
  for (const model of MODELES) {
    try {
      const reponse = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
      for (const part of reponse.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          return { data: Buffer.from(part.inlineData.data, 'base64'), model }
        }
      }
      derniere = new Error(`${model} n'a pas renvoyé d'image`)
    } catch (e) {
      derniere = e
      if (!modeleIndisponible(e)) throw e
      console.warn(`  ${model} indisponible — modèle suivant.`)
    }
  }
  throw derniere
}

// ─────────────────────────────── Exécution

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
    const { data, model } = await genererImage(construirePrompt(article))
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
