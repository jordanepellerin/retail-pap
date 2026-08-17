// Matching catalogue 100 % code (0 $) — croise l'intention normalisée avec les
// métadonnées du catalogue pour classer les articles, avec des justifications
// FR affichées en badges (« Lin, comme souhaité », « Dans votre budget »).

import type { Article, Categorie, Intention } from '../types'
import type { MatchResult } from '../types/ai'
import { CATALOGUE, LIBELLES_OCCASION } from '../data/catalogue'
import { normaliser } from './intent'

/** Catégories proposées à un visiteur qui n'a rien précisé. */
const CATEGORIES_PAR_DEFAUT: Categorie[] = ['costume', 'veste', 'chemise']

/** Un terme du besoin est-il présent dans une liste du catalogue ? */
function intersecte(besoin: string[], catalogue: string[]): string[] {
  const norm = catalogue.map(normaliser)
  return besoin.filter((b) => norm.includes(normaliser(b)))
}

/**
 * Classe le catalogue pour une intention donnée.
 *
 * Filtre DUR : la famille demandée. Le budget filtre aussi, mais SANS jamais
 * conduire à une liste vide : si le plafond annoncé exclut toute la famille, on
 * montre quand même les pièces avec un badge « Au-dessus de votre budget ».
 * Une sélection vide est une impasse ; une sélection honnêtement étiquetée
 * laisse le visiteur décider.
 *
 * Scores DOUX : occasion, matière, couleur, mots-clés, coupe.
 *
 * `categories` permet de restreindre au-delà de l'intention (phase
 * « complétez la tenue », qui interroge d'autres familles).
 */
export function classerArticles(intention: Intention, categories?: Categorie[]): MatchResult[] {
  const familles =
    categories && categories.length > 0
      ? categories
      : intention.categories.length > 0
        ? intention.categories
        : CATEGORIES_PAR_DEFAUT

  const resultats: MatchResult[] = []
  for (const article of CATALOGUE) {
    if (!familles.includes(article.categorie)) continue

    let score = 0
    const raisons: string[] = []

    const occasions = intention.occasions.filter((o) => article.occasions.includes(o))
    if (occasions.length > 0) {
      score += 40
      raisons.push(`Pour ${LIBELLES_OCCASION[occasions[0]]}`)
    }

    const matieres = intersecte(intention.matieres, article.matieres)
    if (matieres.length > 0) {
      score += 25
      raisons.push(`${matieres[0].charAt(0).toUpperCase()}${matieres[0].slice(1)}, comme souhaité`)
    }

    const couleurs = intersecte(intention.couleurs, article.couleurs)
    if (couleurs.length > 0) {
      score += 20
      raisons.push(`Teinte ${couleurs[0]}`)
    }

    // Mots-clés : ceux de l'intention confrontés au vocabulaire de l'article,
    // à son nom et à sa description (« mariage », « été », « velours »…).
    const corpus = normaliser(
      `${article.motsCles.join(' ')} ${article.nom} ${article.descriptionCourte}`
    )
    const hits = intention.motsCles.filter((m) => m.length >= 3 && corpus.includes(normaliser(m)))
    if (hits.length > 0) {
      score += Math.min(15, hits.length * 8)
      raisons.push(`Thème : ${hits[0]}`)
    }

    if (intention.coupe !== null && article.coupe === intention.coupe) {
      score += 10
      raisons.push('Coupe demandée')
    }

    // Un budget annoncé mérite d'être reconnu quand la pièce est confortablement
    // dedans — pas quand elle l'effleure.
    if (intention.budgetMax !== null && article.prix <= intention.budgetMax * 0.85) {
      raisons.push('Dans votre budget')
    }

    resultats.push({ article, score, raisons: [...new Set(raisons)].slice(0, 3) })
  }

  // Tri stable : à score égal, l'ordre du catalogue est conservé.
  const classes = resultats
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.score - a.r.score || a.i - b.i)
    .map(({ r }) => r)

  if (intention.budgetMax === null) return classes
  const plafond = intention.budgetMax
  const dansBudget = classes.filter((m) => m.article.prix <= plafond)
  if (dansBudget.length > 0) return dansBudget
  // Plafond intenable pour cette famille : on montre quand même, en le disant.
  return classes.map((m) => ({
    ...m,
    raisons: ['Au-dessus de votre budget', ...m.raisons].slice(0, 3)
  }))
}

/** Familles réellement demandées (avec repli), pour la phase 1 de la sélection. */
export function categoriesDemandees(intention: Intention): Categorie[] {
  return intention.categories.length > 0 ? intention.categories : CATEGORIES_PAR_DEFAUT
}

/**
 * Reclasse une liste en poussant en tête les articles explicitement accordés
 * aux pièces déjà retenues (`accords` du catalogue).
 */
export function prioriserAccords(matches: MatchResult[], tenue: Article[]): MatchResult[] {
  if (tenue.length === 0) return matches
  const accords = new Set(tenue.flatMap((a) => a.accords))
  return matches
    .map((m, i) => ({ m, i, accorde: accords.has(m.article.id) }))
    .sort((a, b) => Number(b.accorde) - Number(a.accorde) || a.i - b.i)
    .map(({ m, accorde }) =>
      accorde && !m.raisons.includes('Va avec votre sélection')
        ? { ...m, raisons: ['Va avec votre sélection', ...m.raisons].slice(0, 3) }
        : m
    )
}
