// Socle commun aux scripts de génération d'images (`generer-photos.mjs`,
// `generer-looks.mjs`) : la clé API, la lecture du catalogue et la cascade de
// modèles Gemini. Un seul endroit à corriger le jour où le catalogue bouge.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SORTIE = join(RACINE, 'public', 'produits')

// ─────────────────────────────── .env.local
// Lu manuellement (pas de dépendance dotenv) : une variable déjà présente dans
// le shell (CI, export préalable) garde toujours la priorité sur le fichier.
//
// Une ligne SANS VALEUR est ignorée, elle ne réserve pas la variable. C'est le
// cas juste après `cp .env.example .env.local` : le modèle porte un
// `GOOGLE_API_KEY=` vide, et sans cette règle il l'emportait sur la vraie clé
// ajoutée plus bas dans le fichier — première occurrence gagnante.
export function chargerEnvLocal() {
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
    if (cle && valeur && !(cle in process.env)) process.env[cle] = valeur
  }
}

/**
 * Contrôle la présence de la clé AVANT toute construction du SDK, qui avertit
 * de lui-même si elle manque — l'utilisateur mérite un seul message, et le bon.
 * `commande` est le script npm à relancer une fois la clé posée.
 */
export function exigerCle(commande) {
  if (process.env.GOOGLE_API_KEY) return
  console.error(
    'GOOGLE_API_KEY absente.\n\n' +
      'Le plus simple :\n' +
      '  cp .env.example .env.local\n' +
      '  # éditer .env.local, renseigner GOOGLE_API_KEY=votre_cle\n' +
      `  npm run ${commande}\n\n` +
      'Ou en une ligne :\n' +
      `  GOOGLE_API_KEY=votre_cle npm run ${commande}\n\n` +
      'La clé se récupère sur https://aistudio.google.com/apikey — la même que celle du projet Vercel.'
  )
  process.exit(1)
}

// ─────────────────────────────── Lecture du catalogue
// Le catalogue est en TypeScript ; plutôt que d'ajouter un transpileur pour des
// scripts ponctuels, on en extrait les champs utiles par analyse de texte. Le
// format des entrées est stable et vérifié ci-dessous (un article incomplet
// interrompt le script au lieu de produire une image fausse).
//
// Tout ce qui est du domaine — emplacements par famille, plafond de tenue — est
// LU dans les sources plutôt que recopié ici : c'est ce qui empêche les scripts
// de dériver silencieusement du catalogue.

/** Source d'un fichier du dépôt, normalisée en \n.
 *
 * Sous Windows, git checkout out en CRLF (\r\n) selon la config locale
 * (core.autocrlf), et les motifs ci-dessous cherchent des \n littéraux — sans
 * cette normalisation, aucun article n'est trouvé. */
function lireSource(...chemin) {
  return readFileSync(join(RACINE, ...chemin), 'utf-8').replace(/\r\n/g, '\n')
}

/** Le corps d'une déclaration `export const NOM … = { … }` ou `[ … ]`. */
function corpsDeclaration(source, nom, fermeture) {
  const debut = source.indexOf(`export const ${nom}`)
  const fin = debut < 0 ? -1 : source.indexOf(`\n${fermeture}`, debut)
  if (debut < 0 || fin < 0) throw new Error(`${nom} introuvable dans les sources`)
  return source.slice(debut, fin)
}

/** Les valeurs d'une liste littérale `['a', 'b']`, ou [] si la chaîne est vide. */
function listeLitterale(contenu) {
  return [...(contenu ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1])
}

/** `SLOTS_PAR_CATEGORIE` du catalogue : { costume: ['torse-exterieur', …], … }. */
function lireSlotsParCategorie(source) {
  const corps = corpsDeclaration(source, 'SLOTS_PAR_CATEGORIE', '}')
  const table = {}
  for (const [, categorie, contenu] of corps.matchAll(/\n\s*(\w+): \[([^\]]*)\]/g)) {
    table[categorie] = listeLitterale(contenu)
  }
  if (Object.keys(table).length === 0) throw new Error('SLOTS_PAR_CATEGORIE vide')
  return table
}

/** `TENUE_MAX` (src/types/index.ts) : le plafond de pièces d'une tenue. */
export function lireTenueMax() {
  const v = /export const TENUE_MAX = (\d+)/.exec(lireSource('src', 'types', 'index.ts'))?.[1]
  if (!v) throw new Error('TENUE_MAX introuvable dans src/types/index.ts')
  return Number(v)
}

/**
 * Le catalogue, article par article : les champs utiles aux prompts (famille,
 * matière, couleur, coupe, description de rendu), le `slug` du visuel, et de
 * quoi recomposer un look (`slots`, `accords`).
 */
export function lireCatalogue() {
  const source = lireSource('src', 'data', 'catalogue.ts')
  const slotsParCategorie = lireSlotsParCategorie(source)
  const corps = corpsDeclaration(source, 'CATALOGUE', ']')

  const articles = []
  for (const bloc of corps.split(/\n  \{\n/).slice(1)) {
    const champ = (nom) =>
      new RegExp(`\\n?\\s*${nom}:\\s*(?:\\n\\s*)?'((?:[^'\\\\]|\\\\.)*)'`).exec(bloc)?.[1] ?? null
    const nombre = (nom) => {
      const v = new RegExp(`\\n\\s*${nom}: (\\d+)`).exec(bloc)?.[1]
      return v ? Number(v) : null
    }
    // Deux écritures cohabitent dans le catalogue : la table par famille pour
    // les vêtements, la liste explicite pour les accessoires.
    const slots = (() => {
      const m = /\n\s*slots: (?:SLOTS_PAR_CATEGORIE\.(\w+)|\[([^\]]*)\])/.exec(bloc)
      if (!m) return []
      return m[1] ? (slotsParCategorie[m[1]] ?? []) : listeLitterale(m[2])
    })()

    const article = {
      id: champ('id'),
      nom: champ('nom'),
      categorie: champ('categorie'),
      slots,
      matiere: champ('matiere'),
      couleur: champ('couleur'),
      coupe: champ('coupe'),
      prix: nombre('prix'),
      image: champ('image'),
      descriptionRendu: champ('descriptionRendu'),
      accords: listeLitterale(/\n\s*accords: \[([^\]]*)\]/.exec(bloc)?.[1])
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

// ─────────────────────────────── Génération d'images

// Ordre de préférence, comme côté serveur : on ne parie pas sur un identifiant.
const MODELES = (process.env.RENDER_MODEL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(['gemini-3-pro-image', 'gemini-3-pro-image-preview', 'gemini-2.5-flash-image'])

function modeleIndisponible(err) {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return /404|403|429|500|503|not found|not supported|permission|denied|quota|exhausted|overloaded|unavailable/.test(
    msg
  )
}

let client = null

/**
 * Envoie `parts` (texte et/ou images inline) au premier modèle image disponible
 * et renvoie l'image produite. Bascule sur le modèle suivant quand celui-ci est
 * fermé, saturé ou surchargé.
 */
export async function genererImage(parts) {
  client ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })
  let derniere = new Error('aucun modèle candidat')
  for (const model of MODELES) {
    try {
      const reponse = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts }]
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

/** Une image du dépôt en `inlineData`, prête à être jointe au prompt. */
export function fichierEnPart(chemin) {
  return {
    inlineData: {
      mimeType: chemin.endsWith('.png') ? 'image/png' : 'image/jpeg',
      data: readFileSync(chemin).toString('base64')
    }
  }
}
