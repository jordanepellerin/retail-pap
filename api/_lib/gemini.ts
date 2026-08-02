// Client Gemini partagé par les fonctions serverless. La clé n'existe que côté
// serveur (env Vercel / .env.local) — seul le dossier api/ importe @google/genai,
// elle ne peut donc pas fuiter dans le bundle client.

import { GoogleGenAI } from '@google/genai'

// Modèles par ORDRE DE PRÉFÉRENCE, du plus capable au plus sûr (priorité
// qualité, pas coût). Le code ne parie jamais sur un identifiant : il demande à
// l'API la liste des modèles réellement ouverts sur la clé (modelesAccessibles)
// et retient le premier de cette liste qui y figure. Les modèles image « pro »
// et les preview ne sont ouverts que sur une clé facturée : avec une clé
// gratuite la cascade descend d'elle-même vers les modèles GA.
//
// Un nom de modèle n'est pas une constante fiable — une preview passe GA, un
// modèle est renommé, une ouverture dépend du palier de facturation. Figer un
// identifiant, c'est accepter que tous les appels échouent le jour où il change.

// La découverte FILTRE ces listes : un modèle ouvert sur la clé mais absent
// d'ici ne sera jamais utilisé. Les tenir à jour est donc ce qui garde la
// cascade utile le jour où le premier choix se ferme ou sature.

/** Lecture de la demande et reformulation : raisonnement + sortie JSON. */
const ANALYZE_DEFAUTS = [
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash'
]

/** Essayage virtuel : Nano Banana Pro en tête, puis les replis image. */
const RENDER_DEFAUTS = [
  'gemini-3-pro-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image'
]

/** Préférences d'env (un modèle, ou « a, b ») en tête, puis les défauts, sans doublon. */
function preferences(env: string | undefined, defauts: string[]): string[] {
  const perso = (env ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set([...perso, ...defauts])]
}

export const ANALYZE_MODELS = preferences(process.env.ANALYZE_MODEL, ANALYZE_DEFAUTS)
export const RENDER_MODELS = preferences(process.env.RENDER_MODEL, RENDER_DEFAUTS)

let client: GoogleGenAI | null = null

/** Renvoie le client Gemini, ou null si la clé n'est pas configurée (mode démo). */
export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return null
  client ??= new GoogleGenAI({ apiKey })
  return client
}

// Découverte des modèles ouverts sur la clé : UN appel par instance (démarrage
// à froid), mémorisé — y compris son échec — pour ne jamais le refaire à chaque
// requête. Elle évite de dépenser un aller-retour sur un identifiant renommé ou
// fermé, et fait suivre automatiquement les montées de version de l'API.
const DECOUVERTE_TIMEOUT_MS = 5_000
const DECOUVERTE_MAX = 500
let decouverte: Promise<Set<string> | null> | null = null

async function modelesAccessibles(): Promise<Set<string> | null> {
  const gemini = getGemini()
  if (!gemini) return null
  decouverte ??= (async () => {
    try {
      const pager = await gemini.models.list({
        config: {
          pageSize: 100,
          queryBase: true,
          abortSignal: AbortSignal.timeout(DECOUVERTE_TIMEOUT_MS)
        }
      })
      const noms = new Set<string>()
      for await (const modele of pager) {
        const nom = modele.name?.replace(/^models\//, '')
        if (nom) noms.add(nom)
        if (noms.size >= DECOUVERTE_MAX) break
      }
      console.log(
        `Gemini : ${noms.size} modèles ouverts sur la clé — analyse ${[...noms].filter((n) => ANALYZE_MODELS.includes(n)).join(', ') || '∅'} ; ` +
          `essayage ${[...noms].filter((n) => RENDER_MODELS.includes(n)).join(', ') || '∅'}.`
      )
      return noms.size > 0 ? noms : null
    } catch (e) {
      console.warn('Gemini : liste des modèles indisponible — ordre de préférence brut.', e)
      return null
    }
  })()
  return decouverte
}

/**
 * Préférences filtrées par ce que la clé ouvre réellement. Si la découverte
 * échoue (réseau, timeout) ou ne reconnaît aucun candidat, on garde l'ordre brut
 * et c'est la cascade d'appels qui tranchera.
 */
async function modelesRetenus(prefs: string[]): Promise<string[]> {
  const dispo = await modelesAccessibles()
  if (!dispo) return prefs
  const retenus = prefs.filter((m) => dispo.has(m))
  return retenus.length > 0 ? retenus : prefs
}

/**
 * Erreurs qui justifient d'essayer le modèle suivant : modèle absent, fermé sur
 * la clé, quota atteint ou surchargé. Une requête invalide (prompt, schéma) se
 * reproduirait à l'identique sur tous les modèles : elle remonte tout de suite.
 */
function modeleIndisponible(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return /404|403|429|500|503|not found|not supported|unsupported|permission|denied|quota|exhausted|overloaded|unavailable|internal error/.test(
    msg
  )
}

/**
 * Exécute `appel` sur le meilleur modèle disponible et renvoie son résultat avec
 * le modèle réellement utilisé (pour les logs). Ne lève que si aucun modèle de
 * la liste n'a abouti — ou si l'erreur ne vient pas du modèle.
 */
export async function avecMeilleurModele<T>(
  prefs: string[],
  contexte: string,
  appel: (modele: string) => Promise<T>
): Promise<{ resultat: T; modele: string }> {
  const modeles = await modelesRetenus(prefs)
  let derniere: unknown = new Error(`${contexte} : aucun modèle candidat.`)
  for (const modele of modeles) {
    try {
      return { resultat: await appel(modele), modele }
    } catch (e) {
      derniere = e
      if (!modeleIndisponible(e)) throw e
      const raison = (e instanceof Error ? e.message : 'inconnue').slice(0, 200)
      console.warn(`${contexte} : ${modele} indisponible (${raison}) — modèle suivant.`)
    }
  }
  throw derniere instanceof Error ? derniere : new Error(String(derniere))
}

/** Convertit une dataURL d'image en part `inlineData` pour generateContent. */
export function dataUrlEnPart(dataUrl: string): { inlineData: { mimeType: string; data: string } } {
  const virgule = dataUrl.indexOf(',')
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(';'))
  return { inlineData: { mimeType, data: dataUrl.slice(virgule + 1) } }
}
