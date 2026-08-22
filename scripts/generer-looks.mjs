// Génère les photos de LOOK de public/produits/ avec Gemini : le mannequin
// portant la tenue complète composée autour d'une pièce, et pas seulement la
// pièce elle-même.
//
//     GOOGLE_API_KEY=... npm run looks            # tout ce qui manque
//     GOOGLE_API_KEY=... npm run looks -- --force # régénère tout
//     GOOGLE_API_KEY=... npm run looks -- c1 c7   # seulement ces articles
//     npm run looks -- --simuler                  # liste les tenues, sans rien générer
//
// (la clé se pose une fois pour toutes dans .env.local, cf. generer-photos.mjs)
//
// POURQUOI un second fichier plutôt que remplacer `<slug>.jpg` : la photo de
// pièce reste la référence de fidélité envoyée au modèle d'essayage, et la
// vignette des pièces QUI ACCOMPAGNENT dans le tiroir « Acheter le look » —
// elle doit y montrer LA pièce, seule. Le look, lui, est ce qu'on met en grand
// partout où c'est la pièce regardée qui parle : carte de la grille, visuel de
// la fiche, et vignette de tête du tiroir (`<slug>-look.jpg`). L'affichage
// retombe de lui-même sur `<slug>.jpg` quand le look n'existe pas
// (cf. `visuelsLook` dans src/data/catalogue.ts) — rien à déclarer.
//
// La tenue photographiée est celle que le site affiche : même composition que
// `composerLook` (src/lib/look.ts), à partir des `accords` du catalogue. Les
// photos de pièce servent de RÉFÉRENCES au modèle, ce qui garde la couleur et
// la matière de chaque article identiques d'une image à l'autre.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  SORTIE,
  chargerEnvLocal,
  exigerCle,
  fichierEnPart,
  genererImage,
  lireCatalogue,
  lireTenueMax
} from './lib/commun.mjs'

chargerEnvLocal()

/**
 * Familles dont la photo produit montre déjà un mannequin : ce sont elles, et
 * elles seules, qui peuvent contredire le look affiché à côté. Chaussures et
 * accessoires sont photographiés à plat — rien à réconcilier, et un plan en
 * pied ferait perdre la pièce que le visiteur est venu voir.
 */
const FAMILLES_PORTEES = new Set(['costume', 'veste', 'pantalon', 'chemise', 'maille'])

// ─────────────────────────────── Composition du look
// Transcription de `composerLook` (src/lib/look.ts) : l'article regardé en
// tête, puis chaque accord DONT L'EMPLACEMENT EST ENCORE LIBRE, dans l'ordre
// de la liste — le premier arrivé garde sa place.

function composerLook(article, parId, tenueMax) {
  const look = [article]
  const occupes = new Set(article.slots)
  for (const id of article.accords) {
    if (look.length >= tenueMax) break
    const candidat = parId.get(id)
    if (!candidat || candidat.slots.length === 0) continue
    if (candidat.slots.some((s) => occupes.has(s))) continue
    look.push(candidat)
    for (const s of candidat.slots) occupes.add(s)
  }
  return look
}

// ─────────────────────────────── Prompt look

/**
 * Où se porte chaque emplacement, dit au modèle. Formulé pour s'enchaîner après
 * « se porte » : la tournure impersonnelle évite d'accorder un participe avec
 * une pièce dont le script ignore le genre (« une cravate portée », « un
 * costume porté »).
 */
const PLACE_PAR_SLOT = {
  'torse-exterieur': 'sur le buste, par-dessus le haut',
  'torse-interieur': 'à même le buste',
  jambes: 'sur les jambes',
  pieds: 'aux pieds',
  cou: 'au col de la chemise',
  taille: 'à la taille, dans les passants du pantalon',
  poche: 'dans la poche poitrine de la veste',
  poignet: 'au poignet'
}

function lignePiece(article, index) {
  const places = article.slots.map((s) => PLACE_PAR_SLOT[s] ?? 'sur la silhouette').join(' et ')
  return `- image ${index + 1} : ${article.descriptionRendu} — se porte ${places}. Matière : ${article.matiere}. Couleur : ${article.couleur}.`
}

/**
 * Le cadrage suit ce que le look couvre RÉELLEMENT : un plan en pied sur une
 * tenue sans chaussures oblige le modèle à en inventer une paire — exactement
 * ce que la règle « aucune pièce en plus » lui interdit. On coupe donc avant
 * les emplacements que la tenue laisse nus.
 *
 * La marge demandée en haut et en bas n'est pas cosmétique : la fiche produit
 * sert le visuel en `object-cover` dans une colonne à la hauteur de la fenêtre,
 * donc presque carrée là où l'image est en 3:4. Elle rogne du haut et du bas —
 * de 20 % sur un écran d'ordinateur portable — et emporterait les chaussures
 * qu'on vient justement de mettre dans le cadre. Un sixième de marge de chaque
 * côté absorbe ce recadrage ; sur mobile, où la colonne est en 3:4, l'image
 * s'affiche entière, marges comprises.
 */
function cadrage(look) {
  const occupes = new Set(look.flatMap((a) => a.slots))
  if (occupes.has('pieds')) {
    return 'CADRAGE EN PIED : la tête entière ET les chaussures sont dans le cadre, le mannequin est entièrement visible, sans recadrage sur un détail. Laisse une MARGE DE FOND d’environ un sixième de la hauteur de l’image au-dessus de la tête et autant sous les chaussures : le mannequin occupe les deux tiers du milieu de l’image.'
  }
  if (occupes.has('jambes')) {
    return "CADRAGE DES GENOUX À LA TÊTE : la tête entière est dans le cadre, le bas des jambes et les pieds restent hors champ — aucune chaussure n'est visible, la tenue n'en comporte pas."
  }
  return "CADRAGE DU HAUT DES CUISSES À LA TÊTE : la tête entière est dans le cadre, les jambes et les pieds restent hors champ — la tenue ne comporte ni bas ni chaussures."
}

function construirePrompt(look) {
  const pieces = look.map(lignePiece).join('\n')
  return `Photographie de mode e-commerce, haut de gamme, format portrait 3:4.

SUJET : UN SEUL homme, un vrai mannequin de mode en chair et en os — visage, mains et carnation d'une personne réelle —, debout, portant EN MÊME TEMPS les ${look.length} pièces ci-dessous : la tenue complète, rien de plus, rien de moins.

LES PIÈCES DU LOOK — les images jointes sont leurs références, dans cet ordre :
${pieces}

MISE EN SCÈNE : mannequin debout, de face, bras le long du corps, sur un fond de studio uni beige clair. Lumière de studio douce et diffuse, ombres portées légères, aucune ombre dure.

EXIGENCES :
- FIDÉLITÉ : chaque pièce est reproduite exactement telle qu'elle est sur son image de référence — même couleur, même matière, même motif, mêmes détails (boutons, revers, col, poches, coutures) ;
- TOUTES les pièces de la liste sont visibles et identifiables d'un seul coup d'œil. Si l'une risque d'être masquée — une ceinture ou une cravate sous une veste boutonnée —, laisse la veste ouverte plutôt que de l'escamoter ;
- AUCUNE pièce en plus : pas un vêtement, pas un accessoire, pas une montre, pas de lunettes qui ne figure dans la liste. Un emplacement non listé reste nu (pas de cravate si aucune n'est listée) ;
- rendu réaliste du tissu : grain, tombé, plis naturels aux articulations ;
- fond uni et sobre, aucun décor, aucune autre personne.

CADRAGE — règles strictes, ce sont les erreurs les plus fréquentes :
- VUE DE FACE UNIQUEMENT. Le mannequin regarde l'objectif, on voit l'avant de la tenue : boutonnage, revers, col, cravate. Jamais de dos, jamais de profil, jamais de trois quarts arrière.
- ${cadrage(look)}

INTERDITS : aucun mannequin de vitrine, aucun buste de couture, aucune silhouette sans visage — c'est une personne qui porte la tenue. Aucun logo, aucune marque, aucun texte, aucun filigrane, aucun cartouche de prix, aucun collage ni bordure.`
}

// ─────────────────────────────── Exécution

const args = process.argv.slice(2)
const force = args.includes('--force')
// Vérifier la composition des tenues ne coûte ni clé ni quota.
const simuler = args.includes('--simuler')
const idsVoulus = args.filter((a) => !a.startsWith('--'))

const catalogue = lireCatalogue()
const parId = new Map(catalogue.map((a) => [a.id, a]))
const tenueMax = lireTenueMax()

const eligibles = catalogue.filter((a) => FAMILLES_PORTEES.has(a.categorie))

if (simuler) {
  for (const article of eligibles) {
    if (idsVoulus.length > 0 && !idsVoulus.includes(article.id)) continue
    const look = composerLook(article, parId, tenueMax)
    console.log(`${article.slug}-look.jpg`)
    for (const a of look) {
      console.log(`  ${a.id.padEnd(3)} ${a.couleur} ${a.nom} — ${a.slots.join(', ')}`)
    }
    // Le prompt complet seulement si des pièces ont été nommées : sur le
    // catalogue entier, il noierait la liste des tenues.
    if (idsVoulus.length > 0) console.log(`\n${construirePrompt(look)}\n`)
  }
  process.exit(0)
}

exigerCle('looks')

const aFaire = eligibles.filter((a) => {
  if (idsVoulus.length > 0 && !idsVoulus.includes(a.id)) return false
  if (force) return true
  return !existsSync(join(SORTIE, `${a.slug}-look.jpg`))
})

if (aFaire.length === 0) {
  console.log(`Rien à générer (${eligibles.length} pièces portées, tous les looks existent déjà).`)
  console.log('Utiliser --force pour les régénérer.')
  process.exit(0)
}

mkdirSync(SORTIE, { recursive: true })
console.log(`${aFaire.length} look(s) à générer sur ${eligibles.length} pièces portées.\n`)

let reussites = 0
const echecs = []
for (const [i, article] of aFaire.entries()) {
  const etiquette = `[${i + 1}/${aFaire.length}] ${article.slug}-look`
  const look = composerLook(article, parId, tenueMax)

  if (look.length < 2) {
    console.log(`${etiquette} — ignoré : aucun accord exploitable, le look se réduit à la pièce.`)
    continue
  }

  // Les références sont les photos de pièce. Sans elles le modèle réinvente
  // couleurs et matières : mieux vaut ne rien écrire et le dire.
  const references = look.map((a) => join(SORTIE, `${a.slug}.jpg`))
  const manquantes = references.filter((chemin) => !existsSync(chemin))
  if (manquantes.length > 0) {
    echecs.push(article.slug)
    console.error(
      `${etiquette} — ÉCHEC : photo(s) de pièce absente(s) : ` +
        `${manquantes.map((c) => basename(c)).join(', ')}.\n` +
        '  Lancer `npm run photos` d’abord — le look se compose à partir de ces références.'
    )
    continue
  }

  try {
    const { data, model } = await genererImage([
      ...references.map(fichierEnPart),
      { text: construirePrompt(look) }
    ])
    writeFileSync(join(SORTIE, `${article.slug}-look.jpg`), data)
    reussites += 1
    console.log(
      `${etiquette} — ${look.length} pièces (${look.map((a) => a.id).join(' + ')}), ` +
        `${Math.round(data.length / 1024)} Ko via ${model}`
    )
  } catch (e) {
    echecs.push(article.slug)
    console.error(`${etiquette} — ÉCHEC : ${e instanceof Error ? e.message : e}`)
  }
}

console.log(`\n${reussites} look(s) écrit(s) dans public/produits/.`)
if (echecs.length > 0) {
  console.log(`${echecs.length} échec(s) : ${echecs.join(', ')}`)
  console.log('Relancer la commande reprendra uniquement les manquants.')
}
console.log('Vérifier le rendu, puis committer les `-look.jpg` — la fiche produit bascule dessus.')
