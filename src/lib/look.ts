// Composition du look d'une pièce — 100 % code, déterministe, aucun appel IA.
//
// Le catalogue porte déjà le lien entre articles (`Article.accords`, écrit à la
// main pièce par pièce). Le look est la lecture stricte de cette liste : on part
// de l'article regardé, puis on retient chaque accord DONT L'EMPLACEMENT EST
// ENCORE LIBRE.
//
// Différence assumée avec `basculerArticle` (src/lib/tenue.ts) : là-bas un
// nouvel article ÉVINCE ceux qui occupent son emplacement, parce que c'est le
// visiteur qui compose et que son dernier geste doit gagner. Ici personne ne
// compose : l'ordre des `accords` fait foi, et le premier arrivé garde sa place.

import type { Article, Slot } from '../types'
import { TENUE_MAX } from '../types'
import type { RenderArticle } from '../types/ai'
import { parIdSafe, visuelArticle } from '../data/catalogue'
import { downscaleDataUrl } from './image'

/** Côté long d'un visuel produit envoyé au rendu — même valeur que StepRender. */
const VISUEL_RENDU_MAX = 768

/**
 * Le look complet autour d'un article : l'article lui-même en tête, puis ses
 * accords compatibles. Toujours au moins un élément — l'article de départ.
 */
export function composerLook(article: Article): Article[] {
  const look: Article[] = [article]
  const occupes = new Set<Slot>(article.slots)

  for (const id of article.accords) {
    if (look.length >= TENUE_MAX) break
    const candidat = parIdSafe(id)
    // Listes d'accords tolérantes : un id inconnu, ou une pièce qui ne
    // revendique aucun emplacement, est simplement ignoré.
    if (!candidat || candidat.slots.length === 0) continue
    if (candidat.slots.some((s) => occupes.has(s))) continue
    look.push(candidat)
    for (const s of candidat.slots) occupes.add(s)
  }

  return look
}

/**
 * Visuels des pièces prêts pour /api/render.
 *
 * On envoie la PHOTO produit (`<slug>.jpg`) — celle que le visiteur a sous les
 * yeux — avec repli sur le SVG du catalogue si elle n'a pas été générée, comme
 * le fait déjà `VisuelProduit`. C'est la référence de fidélité du modèle : plus
 * elle ressemble à ce qui est affiché, moins le rendu surprend.
 */
export async function visuelsPourRendu(articles: Article[]): Promise<RenderArticle[]> {
  return Promise.all(
    articles.map(async (a): Promise<RenderArticle> => {
      const { src, secours } = visuelArticle(a)
      const reduit = await downscaleDataUrl(src, VISUEL_RENDU_MAX).catch(() =>
        downscaleDataUrl(secours, VISUEL_RENDU_MAX)
      )
      return { image: reduit.dataUrl, slots: a.slots, description: a.descriptionRendu }
    })
  )
}
