// Une seule définition de « mobile » pour toute l'application : le pointeur
// grossier (le doigt), et non la largeur de la fenêtre ni l'user-agent. C'est
// ce qui distingue vraiment un téléphone d'un ordinateur — une fenêtre étroite
// sur portable reste un portable, et l'user-agent se falsifie.

import { useSyncExternalStore } from 'react'

const REQUETE_MOBILE = '(pointer: coarse)'

function liste(): MediaQueryList | null {
  return typeof window === 'undefined' ? null : (window.matchMedia?.(REQUETE_MOBILE) ?? null)
}

/** Appareil tactile — téléphone ou tablette — par opposition à souris/trackpad. */
export function surMobile(): boolean {
  return liste()?.matches === true
}

function abonner(rappel: () => void): () => void {
  const mql = liste()
  if (!mql?.addEventListener) return () => {}
  mql.addEventListener('change', rappel)
  return () => mql.removeEventListener('change', rappel)
}

/**
 * Version réactive de `surMobile()` : le composant se re-rend si le pointeur
 * change en cours de route (souris branchée sur une tablette, hybride basculé
 * en mode tablette, outils responsive du navigateur).
 */
export function useSurMobile(): boolean {
  return useSyncExternalStore(abonner, surMobile, () => false)
}
