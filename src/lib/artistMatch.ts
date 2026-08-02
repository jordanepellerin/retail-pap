// Détection d'artiste 100 % code — première ligne du pipeline hybride :
// si l'utilisateur nomme un artiste, aucun appel IA n'est nécessaire.

import { ARTISTES } from '../data/catalogue'

/** Minuscules + suppression des accents (NFD) pour comparer sans casse ni diacritiques. */
export function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
 * Repère les artistes du catalogue nommés dans un texte libre.
 * Match direct (nom complet ou nom de famille en sous-chaîne, sans accents),
 * puis flou (Levenshtein ≤ 1 sur les mots ≥ 5 lettres : « catalno » → Catalano).
 */
export function detectArtistes(texte: string): string[] {
  const t = normaliser(texte)
  if (!t.trim()) return []
  const tokens = t.split(/[^a-z0-9]+/).filter(Boolean)

  const hits: string[] = []
  for (const artiste of ARTISTES) {
    const complet = normaliser(artiste)
    const famille = complet.split(/\s+/).slice(-1)[0]
    const direct = t.includes(complet) || t.includes(famille)
    const flou =
      famille.length >= 5 &&
      tokens.some((tok) => tok.length >= 5 && levenshtein(tok, famille) <= 1)
    if (direct || flou) hits.push(artiste)
  }
  return hits
}
