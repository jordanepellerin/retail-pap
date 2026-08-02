// Construit la présentation éditoriale des artistes retenus (étape intermédiaire
// « Les artistes retenus », entre la réflexion et la sélection d'œuvres).
// 100 % code / 0 € : réutilise les matches déjà classés, les sujets/mots-clés
// déjà extraits par l'analyse IA (state.analyse.intent) et les bios éditoriales.

import type { MatchResult } from '../types/ai'
import type { Oeuvre, WidgetState } from '../types'
import { BIO_ARTISTES, MOTS_CLES_ARTISTES } from '../data/catalogue'
import { detectArtistes, normaliser } from './artistMatch'

/** Un artiste mis en avant : visuel représentatif, intro éditoriale, justification. */
export interface ArtistePresente {
  artiste: string
  oeuvre: Oeuvre
  bio: string
  justification: string
}

/** Nombre d'artistes présentés avant la sélection. */
export const MAX_ARTISTES = 3

/**
 * Regroupe les matches par artiste (ordre de classement conservé) et retient,
 * pour chacun, sa meilleure œuvre et ses raisons. Source unique de vérité pour
 * « quels artistes présenter » — partagée par le matching (justification IA) et
 * l'écran de présentation.
 */
export function grouperArtistesRetenus(
  matches: MatchResult[] | null,
  max = MAX_ARTISTES
): { artiste: string; oeuvre: Oeuvre; raisons: string[] }[] {
  if (!matches || matches.length === 0) return []
  const ordre: string[] = []
  const parArtiste = new Map<string, { oeuvre: Oeuvre; raisons: string[] }>()
  for (const m of matches) {
    const nom = m.oeuvre.artiste
    if (!parArtiste.has(nom)) {
      parArtiste.set(nom, { oeuvre: m.oeuvre, raisons: m.raisons })
      ordre.push(nom)
    }
  }
  return ordre.slice(0, max).map((artiste) => ({ artiste, ...parArtiste.get(artiste)! }))
}

/** Noms des artistes retenus (top N), dans l'ordre de classement. */
export function artistesRetenus(matches: MatchResult[] | null, max = MAX_ARTISTES): string[] {
  return grouperArtistesRetenus(matches, max).map((g) => g.artiste)
}

/** Met une liste de termes en une énumération FR lisible (« a, b et c »). */
function enumererFr(termes: string[]): string {
  if (termes.length <= 1) return termes[0] ?? ''
  return `${termes.slice(0, -1).join(', ')} et ${termes[termes.length - 1]}`
}

/**
 * Termes du client qui résonnent avec l'univers de l'artiste : intersection
 * entre ce que l'analyse a compris (sujets + mots-clés) et les mots-clés de
 * l'artiste, en repli sur les « Thème : … » des raisons du matching.
 */
function termesResonnants(
  artiste: string,
  intentTermes: string[],
  raisons: string[]
): string[] {
  const motsArtiste = (MOTS_CLES_ARTISTES[artiste] ?? []).map(normaliser)
  const communs = intentTermes.filter((t) => motsArtiste.includes(normaliser(t)))
  if (communs.length > 0) return [...new Set(communs)].slice(0, 2)

  // Repli : les thèmes déjà retenus par le scoring pour cet artiste.
  const themes = raisons
    .filter((r) => r.startsWith('Thème : '))
    .map((r) => r.slice('Thème : '.length))
  return [...new Set(themes)].slice(0, 2)
}

/**
 * Construit la liste des artistes à présenter depuis l'état du widget.
 * Chaque justification vient de l'IA (state.justify) quand elle est disponible,
 * sinon d'un repli 100 % code (termes du client × univers de l'artiste).
 * Retourne une liste vide si le matching n'a rien produit (l'écran gère ce repli).
 */
export function construireArtistesPresentes(state: WidgetState): ArtistePresente[] {
  const groupes = grouperArtistesRetenus(state.matches)
  if (groupes.length === 0) return []

  const intent = state.analyse?.intent
  const intentTermes = [...(intent?.sujets ?? []), ...(intent?.motsCles ?? [])]
  const artistesNommes = new Set(
    [...detectArtistes(state.recherche), ...(intent?.artistes ?? [])].map(normaliser)
  )

  // Justifications rédigées par l'IA, indexées par nom d'artiste (si présentes).
  const phrasesIA = new Map(
    (state.justify.result?.justifications ?? []).map((j) => [normaliser(j.artiste), j.phrase])
  )

  return groupes.map(({ artiste, oeuvre, raisons }) => {
    const bio = BIO_ARTISTES[artiste] ?? ''

    const phraseIA = phrasesIA.get(normaliser(artiste))
    let justification: string
    if (phraseIA) {
      justification = phraseIA
    } else if (artistesNommes.has(normaliser(artiste))) {
      justification = `Vous avez cité ${artiste} : voici une sélection de ses œuvres qui pourraient vous plaire.`
    } else {
      const termes = termesResonnants(artiste, intentTermes, raisons)
      justification =
        termes.length > 0
          ? `Les éléments que vous évoquez — ${enumererFr(termes)} — sont au cœur du travail de ${artiste}.`
          : `L'univers de ${artiste} entre en résonance avec votre recherche.`
    }

    return { artiste, oeuvre, bio, justification }
  })
}
