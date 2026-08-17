// Reformulation du besoin — repli 100 % code de /api/brief.
// L'étape `brief` doit être opérationnelle sans clé API : c'est le moment où le
// visiteur valide qu'on l'a compris, on ne peut pas le laisser devant un vide.

import type { Categorie, Intention } from '../types'
import type { BriefResult } from '../types/ai'
import { LIBELLES_CATEGORIE, LIBELLES_OCCASION, formatPrix } from '../data/catalogue'

/** Critères retenus, en clair — affichés en puces sous la reformulation. */
export interface Critere {
  /** Champ d'intention concerné, pour permettre de le retirer d'un geste. */
  champ: 'categories' | 'occasions' | 'matieres' | 'couleurs' | 'budgetMax' | 'coupe'
  valeur: string
  label: string
}

const LIBELLES_COUPE: Record<string, string> = {
  slim: 'coupe ajustée',
  tailored: 'coupe tailored',
  regular: 'coupe droite'
}

function avecArticle(categorie: Categorie): string {
  return LIBELLES_CATEGORIE[categorie].avecArticle
}

/** Liste plate des critères, dans l'ordre où on les montre. */
export function criteres(intention: Intention): Critere[] {
  const liste: Critere[] = []
  for (const c of intention.categories) {
    liste.push({ champ: 'categories', valeur: c, label: LIBELLES_CATEGORIE[c].singulier })
  }
  for (const o of intention.occasions) {
    liste.push({ champ: 'occasions', valeur: o, label: `Pour ${LIBELLES_OCCASION[o]}` })
  }
  for (const m of intention.matieres) {
    liste.push({ champ: 'matieres', valeur: m, label: `${m.charAt(0).toUpperCase()}${m.slice(1)}` })
  }
  for (const c of intention.couleurs) {
    liste.push({ champ: 'couleurs', valeur: c, label: `Teintes ${c}` })
  }
  if (intention.coupe) {
    liste.push({
      champ: 'coupe',
      valeur: intention.coupe,
      label: LIBELLES_COUPE[intention.coupe] ?? intention.coupe
    })
  }
  if (intention.budgetMax !== null) {
    liste.push({
      champ: 'budgetMax',
      valeur: String(intention.budgetMax),
      label: `Jusqu'à ${formatPrix(intention.budgetMax)}`
    })
  }
  return liste
}

/**
 * Reformulation de repli, écrite en code. Volontairement sobre : mieux vaut une
 * phrase juste et un peu plate qu'une phrase brillante et fausse.
 */
export function briefCode(intention: Intention, demande: string): BriefResult {
  const familles = intention.categories.map(avecArticle)
  const objet =
    familles.length === 0
      ? 'une tenue'
      : familles.length === 1
        ? familles[0]
        : `${familles.slice(0, -1).join(', ')} et ${familles[familles.length - 1]}`

  const morceaux: string[] = []
  if (intention.matieres.length > 0) morceaux.push(`en ${intention.matieres.join(' ou ')}`)
  if (intention.couleurs.length > 0) morceaux.push(`dans les tons ${intention.couleurs.join(', ')}`)
  if (intention.coupe) morceaux.push(LIBELLES_COUPE[intention.coupe] ?? '')
  if (intention.occasions.length > 0) {
    morceaux.push(`pour ${LIBELLES_OCCASION[intention.occasions[0]]}`)
  }
  if (intention.budgetMax !== null) {
    morceaux.push(`dans une limite de ${formatPrix(intention.budgetMax)}`)
  }

  const details = morceaux.filter(Boolean).join(', ')
  const reformulation = `Vous cherchez ${objet}${details ? ` ${details}` : ''}.`

  // Le conseil dépend de ce qui a été le plus discriminant dans la demande.
  let conseil = 'Voici ce que notre sélection propose de plus proche.'
  if (intention.occasions.includes('mariage-marie')) {
    conseil = "Pour le jour où l'on vous regarde tous, je privilégie les pièces les plus habillées."
  } else if (intention.occasions.includes('soiree')) {
    conseil = 'Registre soirée : matières profondes et pièces sombres en priorité.'
  } else if (intention.matieres.includes('lin')) {
    conseil = 'Le lin se froisse — c’est ce qui fait son allure, pas un défaut.'
  } else if (intention.budgetMax !== null) {
    conseil = 'Rien au-dessus de votre plafond ne vous sera proposé.'
  } else if (demande.trim().length === 0) {
    conseil = 'Dites-m’en plus à tout moment et j’affine la sélection.'
  }

  return { reformulation, conseil }
}
