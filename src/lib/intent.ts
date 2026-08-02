// Détection d'intention 100 % code — première ligne du pipeline hybride.
// Elle sert à deux choses : ne PAS poser une question dont la réponse est déjà
// dans la demande libre, et faire tourner la démo sans clé API. L'IA
// (/api/analyze) ne fait ensuite qu'affiner ce que le code n'a pas su lire.

import type { Categorie, Coupe, Intention, Occasion, WidgetState } from '../types'
import { INTENTION_VIDE } from '../types'
import { VOCABULAIRE_COULEURS, VOCABULAIRE_MATIERES } from '../data/catalogue'
import { appliquerReponses } from '../data/questions'

/** Minuscules + suppression des accents (NFD) pour comparer sans casse ni diacritiques. */
export function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Distance de Levenshtein simple (les chaînes comparées restent courtes). */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i, ...Array<number>(n).fill(0)]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[n]
}

/**
 * Synonymes → catégorie. Les formes sont déjà normalisées (sans accent) ;
 * le pluriel est couvert par la recherche en sous-chaîne (« costumes »
 * contient « costume »).
 */
const MOTS_CATEGORIE: [string, Categorie][] = [
  ['costume', 'costume'],
  ['complet', 'costume'],
  ['smoking', 'costume'],
  ['tuxedo', 'costume'],
  ['deux pieces', 'costume'],
  ['veste', 'veste'],
  ['blazer', 'veste'],
  ['veston', 'veste'],
  ['pantalon', 'pantalon'],
  ['chino', 'pantalon'],
  ['jean', 'pantalon'],
  ['chemise', 'chemise'],
  ['pull', 'maille'],
  ['maille', 'maille'],
  ['gilet', 'maille'],
  ['polo', 'maille'],
  ['cardigan', 'maille'],
  ['chaussure', 'chaussures'],
  ['soulier', 'chaussures'],
  ['derby', 'chaussures'],
  ['richelieu', 'chaussures'],
  ['mocassin', 'chaussures'],
  ['sneaker', 'chaussures'],
  ['basket', 'chaussures'],
  ['accessoire', 'accessoire'],
  ['cravate', 'accessoire'],
  ['noeud papillon', 'accessoire'],
  ['pochette', 'accessoire'],
  ['ceinture', 'accessoire']
]

const MOTS_OCCASION: [string, Occasion][] = [
  ['je me marie', 'mariage-marie'],
  ['mon mariage', 'mariage-marie'],
  ['marie', 'mariage-marie'],
  ['epouse', 'mariage-marie'],
  ['mariage', 'mariage-invite'],
  ['temoin', 'mariage-invite'],
  ['bureau', 'bureau'],
  ['travail', 'bureau'],
  ['boulot', 'bureau'],
  ['reunion', 'bureau'],
  ['entretien', 'bureau'],
  ['soiree', 'soiree'],
  ['gala', 'soiree'],
  ['black tie', 'soiree'],
  ['cocktail', 'soiree'],
  ['ceremonie', 'ceremonie'],
  ['bapteme', 'ceremonie'],
  ['enterrement', 'ceremonie'],
  ['quotidien', 'quotidien'],
  ['tous les jours', 'quotidien'],
  ['week end', 'quotidien'],
  ['decontracte', 'quotidien'],
  ['casual', 'quotidien']
]

const MOTS_COUPE: [string, Coupe][] = [
  ['slim', 'slim'],
  ['ajuste', 'slim'],
  ['cintre', 'slim'],
  ['pres du corps', 'slim'],
  ['tailored', 'tailored'],
  ['droit', 'regular'],
  ['ample', 'regular'],
  ['confortable', 'regular'],
  ['regular', 'regular']
]

/** Couleurs exprimées autrement que par le mot exact du vocabulaire. */
const SYNONYMES_COULEUR: [string, string][] = [
  ['navy', 'bleu'],
  ['bleu marine', 'marine'],
  ['anthracite', 'anthracite'],
  ['charbon', 'anthracite'],
  ['sable', 'beige'],
  ['creme', 'ecru'],
  ['ivoire', 'ecru'],
  ['kaki', 'vert'],
  ['olive', 'olive'],
  ['camel', 'brun'],
  ['marron', 'brun'],
  ['tabac', 'brun'],
  ['bordeaux', 'bordeaux'],
  ['grenat', 'bordeaux'],
  ['rose', 'rose'],
  ['clair', 'ecru'],
  ['fonce', 'marine']
]

/** Un mot du texte est-il « proche » du terme cherché (faute de frappe tolérée) ? */
function contient(texte: string, tokens: string[], terme: string): boolean {
  if (texte.includes(terme)) return true
  if (terme.includes(' ') || terme.length < 5) return false
  return tokens.some((t) => t.length >= 5 && levenshtein(t, terme) <= 1)
}

/**
 * Budget maximum exprimé en euros. Reconnaît « 800 € », « moins de 800 »,
 * « max 1200 », « 1 200 euros ». En cas de plusieurs nombres, on retient le
 * plus grand (« entre 500 et 800 » → 800, le plafond).
 */
function detecterBudget(texte: string): number | null {
  const montants: number[] = []
  for (const m of texte.matchAll(/(\d[\d\s.]{1,7})\s*(?:e|eur|euro|euros|€)?\b/g)) {
    const n = Number(m[1].replace(/[\s.]/g, ''))
    // Un nombre plausible en prêt-à-porter, pour ne pas confondre avec une
    // taille (48), une année (2026) ou une pointure (42).
    if (Number.isFinite(n) && n >= 50 && n <= 20_000) montants.push(n)
  }
  return montants.length > 0 ? Math.max(...montants) : null
}

/** Lit la demande libre et en extrait tout ce qui est reconnaissable sans IA. */
export function detecterIntention(texte: string): Intention {
  const t = normaliser(texte)
  if (!t.trim()) return { ...INTENTION_VIDE }
  const tokens = t.split(/[^a-z0-9]+/).filter(Boolean)

  const categories: Categorie[] = []
  for (const [mot, cat] of MOTS_CATEGORIE) {
    if (contient(t, tokens, mot) && !categories.includes(cat)) categories.push(cat)
  }

  const occasions: Occasion[] = []
  for (const [mot, occ] of MOTS_OCCASION) {
    // « je me marie » et « mariage » se recouvrent : la première règle qui
    // matche gagne, l'ordre de MOTS_OCCASION va donc du plus spécifique au plus
    // général, et on ne retient qu'une occasion de la famille mariage.
    if (!contient(t, tokens, mot)) continue
    const dejaMariage = occasions.some((o) => o.startsWith('mariage'))
    if (occ.startsWith('mariage') && dejaMariage) continue
    if (!occasions.includes(occ)) occasions.push(occ)
  }

  const matieres = VOCABULAIRE_MATIERES.filter((m) => contient(t, tokens, normaliser(m)))

  const couleurs = new Set<string>()
  for (const c of VOCABULAIRE_COULEURS) {
    if (contient(t, tokens, normaliser(c))) couleurs.add(c)
  }
  for (const [mot, couleur] of SYNONYMES_COULEUR) {
    if (contient(t, tokens, mot) && VOCABULAIRE_COULEURS.includes(couleur)) couleurs.add(couleur)
  }

  let coupe: Coupe | null = null
  for (const [mot, c] of MOTS_COUPE) {
    if (contient(t, tokens, mot)) {
      coupe = c
      break
    }
  }

  return {
    categories,
    occasions,
    matieres,
    couleurs: [...couleurs],
    budgetMax: detecterBudget(t),
    coupe,
    motsCles: []
  }
}

/**
 * Intention de référence pour l'aval du parcours. Après l'étape `matching`,
 * l'intention consolidée (code + IA + réponses, éventuellement amendée par le
 * visiteur au brief) vit dans `state.analyse.intent` — c'est la seule source de
 * vérité. Avant, on la recalcule en pur code.
 */
export function intentionCourante(state: WidgetState): Intention {
  if (state.analyse) return state.analyse.intent
  return appliquerReponses(detecterIntention(state.demande), state.reponses)
}

/**
 * L'IA a-t-elle quelque chose à apporter ? Si le code a déjà lu la famille
 * demandée ET au moins un autre signal, l'appel n'apporterait rien : on
 * l'économise (et la démo tourne sans clé).
 */
export function besoinAnalyseIA(demande: string, intention: Intention): boolean {
  if (demande.trim().length === 0) return false
  const autreSignal =
    intention.occasions.length > 0 ||
    intention.matieres.length > 0 ||
    intention.couleurs.length > 0 ||
    intention.budgetMax !== null
  return intention.categories.length === 0 || !autreSignal
}

/**
 * Fusionne deux intentions. `base` (code, ou réponses de l'utilisateur) prime
 * toujours : l'IA ne fait que combler les champs restés vides.
 */
export function fusionner(base: Intention, complement: Intention | null): Intention {
  if (!complement) return base
  const union = (a: string[], b: string[]) => (a.length > 0 ? a : b)
  return {
    categories: base.categories.length > 0 ? base.categories : complement.categories,
    occasions: base.occasions.length > 0 ? base.occasions : complement.occasions,
    matieres: union(base.matieres, complement.matieres),
    couleurs: union(base.couleurs, complement.couleurs),
    budgetMax: base.budgetMax ?? complement.budgetMax,
    coupe: base.coupe ?? complement.coupe,
    motsCles: union(base.motsCles, complement.motsCles)
  }
}
