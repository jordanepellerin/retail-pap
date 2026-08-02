// Garde-fous de composition de tenue.
//
// Principe : chaque article revendique un ou plusieurs EMPLACEMENTS (`Slot`).
// Deux articles qui revendiquent le même emplacement ne peuvent pas être portés
// ensemble — c'est ce qui interdit deux pantalons, deux paires de chaussures,
// ou un costume avec un pantalon séparé (le costume occupe `jambes` à lui seul).
//
// Un conflit ne BLOQUE jamais : il REMPLACE, et l'interface l'explique. Bloquer
// un clic sans dire pourquoi est la meilleure façon de perdre le visiteur.

import type { Article, Slot } from '../types'
import { TENUE_MAX } from '../types'
import { LIBELLES_SLOT } from '../data/catalogue'

export interface ResolutionAjout {
  tenue: Article[]
  /** Articles évincés par l'ajout — la notice affichée s'appuie dessus. */
  retires: Article[]
}

/** Deux articles se disputent-ils au moins un emplacement ? */
function enConflit(a: Article, b: Article): boolean {
  return a.slots.some((s) => b.slots.includes(s))
}

/**
 * Ajoute un article à la tenue en évinçant ceux qui occupent les mêmes
 * emplacements. Ajouter un article déjà présent le retire (bascule).
 */
export function basculerArticle(tenue: Article[], article: Article): ResolutionAjout {
  if (tenue.some((a) => a.id === article.id)) {
    return { tenue: tenue.filter((a) => a.id !== article.id), retires: [] }
  }
  const retires = tenue.filter((a) => enConflit(a, article))
  const restants = tenue.filter((a) => !retires.includes(a))
  // Plafond de sécurité : une tenue plus longue que ça n'a plus de sens, et le
  // rendu ne saurait pas quoi en faire.
  if (restants.length >= TENUE_MAX) return { tenue, retires: [] }
  return { tenue: [...restants, article], retires }
}

/** Retire un article de la tenue. */
export function retirerArticle(tenue: Article[], id: string): Article[] {
  return tenue.filter((a) => a.id !== id)
}

/**
 * Notice expliquant un remplacement, à la première personne du conseiller.
 * Renvoie null s'il n'y a rien à signaler.
 */
export function noticeRemplacement(ajoute: Article, retires: Article[]): string | null {
  if (retires.length === 0) return null
  const noms = retires.map((a) => `« ${a.nom} »`).join(' et ')
  const pluriel = retires.length > 1
  const retire = pluriel ? 'ont été retirés' : 'a été retiré'
  const remplace = pluriel ? 'ont été remplacés' : 'a été remplacé'
  // Cas emblématique : le costume évince veste et/ou pantalon séparés.
  if (ajoute.categorie === 'costume') {
    return `${noms} ${retire} : « ${ajoute.nom} » comprend déjà sa veste et son pantalon.`
  }
  if (retires.every((a) => a.categorie === ajoute.categorie)) {
    return `${noms} ${remplace} — on ne porte qu'une pièce par emplacement.`
  }
  return `${noms} ${remplace} par « ${ajoute.nom} ».`
}

/** Emplacements couverts par la tenue. */
export function slotsOccupes(tenue: Article[]): Set<Slot> {
  return new Set(tenue.flatMap((a) => a.slots))
}

/**
 * Avertissements doux affichés au récapitulatif : des pièces qui ne « tiennent »
 * qu'accompagnées. Jamais bloquants — libre au visiteur de les ignorer.
 */
export function alertesTenue(tenue: Article[]): string[] {
  const slots = slotsOccupes(tenue)
  const alertes: string[] = []
  if (slots.has('poche') && !slots.has('torse-exterieur')) {
    alertes.push('Une pochette sans veste ni costume ne sera pas visible sur le rendu.')
  }
  if (slots.has('cou') && !slots.has('torse-interieur')) {
    alertes.push('Une cravate se porte sur une chemise — pensez à en ajouter une.')
  }
  if (slots.has('taille') && !slots.has('jambes')) {
    alertes.push('Une ceinture demande un pantalon pour se voir.')
  }
  if (slots.has('torse-exterieur') && !slots.has('jambes')) {
    alertes.push('Il manque un bas à votre tenue — pantalon ou costume complet.')
  }
  return alertes
}

/** Total de la tenue, en euros. */
export function totalTenue(tenue: Article[]): number {
  return tenue.reduce((somme, a) => somme + a.prix, 0)
}

/**
 * Emplacements listés en clair, pour expliquer au visiteur ce que le rendu va
 * remplacer sur sa photo.
 */
export function resumeSlots(tenue: Article[]): string {
  const libelles = [...slotsOccupes(tenue)].map((s) => LIBELLES_SLOT[s])
  if (libelles.length === 0) return ''
  if (libelles.length === 1) return libelles[0]
  return `${libelles.slice(0, -1).join(', ')} et ${libelles[libelles.length - 1]}`
}
