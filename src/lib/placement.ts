// Calcul du rectangle de placement — c'est le CODE qui garantit les proportions
// réelles (cm/px × dimensions de l'œuvre), jamais le modèle génératif.

import type { Oeuvre } from '../types'
import type { AnalyseResult, PointPct, QuadPct, RectPct } from '../types/ai'

export interface Placement {
  rect: RectPct
  /** Ce qui a permis le calcul : échelle réelle, zone seule, ou valeurs par défaut. */
  source: 'echelle' | 'zone' | 'defaut'
}

export interface PlacementQuad {
  /** 4 coins (haut-gauche, haut-droit, bas-droit, bas-gauche) en % de la photo. */
  quad: QuadPct
  /** perspective = coins du modèle ; plat = rect axis-aligné (repli). */
  source: 'perspective' | 'plat' | 'defaut'
}

// Positions historiques du widget, conservées comme repli sans analyse.
const DEFAUT_PEINTURE: RectPct = { x: 27, y: 14, w: 46, h: 40 }
const DEFAUT_SCULPTURE: RectPct = { x: 32, y: 40, w: 36, h: 50 }

/** Largeur réelle estimée (cm) — les sculptures n'ont souvent que la hauteur. */
function largeurCm(o: Oeuvre): number | null {
  if (o.dims.l !== null) return o.dims.l
  if (o.dims.h !== null && o.tag === 'sculpture') return o.dims.h * 0.55
  return o.dims.h
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Rect de placement (en % de la photo) pour une œuvre donnée.
 * Priorité : échelle réelle (pxPerCm) > ajustement dans la zone > défauts.
 * Peinture : centrée dans la zone. Sculpture : posée au bas de la zone.
 */
export function rectPourOeuvre(
  analyse: AnalyseResult | null,
  oeuvre: Oeuvre,
  photoW: number,
  photoH: number
): Placement {
  const zone = analyse?.photo?.zones[0] ?? null
  const defaut = oeuvre.tag === 'peinture' ? DEFAUT_PEINTURE : DEFAUT_SCULPTURE
  if (!zone || photoW <= 0 || photoH <= 0) return { rect: defaut, source: 'defaut' }

  // Échelle la plus fiable : largeur du mur mesurée par le client (planLargeurCm)
  // ↔ largeur en px de zones[0]. Sinon, pxPerCm estimé par le modèle.
  const planCm = analyse?.photo?.planLargeurCm ?? null
  const pxPerCm =
    planCm && planCm > 0
      ? ((zone.w / 100) * photoW) / planCm
      : (analyse?.photo?.pxPerCm ?? null)

  const hCm = oeuvre.dims.h ?? oeuvre.dims.l
  const lCm = largeurCm(oeuvre)

  let wPct: number
  let hPct: number
  let source: Placement['source']

  if (pxPerCm && hCm && lCm) {
    // Taille vraie : cm × px/cm, convertie en % de la photo.
    wPct = ((lCm * pxPerCm) / photoW) * 100
    hPct = ((hCm * pxPerCm) / photoH) * 100
    source = 'echelle'
  } else if (hCm && lCm) {
    // Pas d'échelle : occuper ~70 % de la largeur de la zone, aspect réel conservé.
    wPct = zone.w * 0.7
    hPct = (((wPct / 100) * photoW * (hCm / lCm)) / photoH) * 100
    if (hPct > zone.h * 0.9) {
      const reduction = (zone.h * 0.9) / hPct
      hPct *= reduction
      wPct *= reduction
    }
    source = 'zone'
  } else {
    return { rect: defaut, source: 'defaut' }
  }

  // Bornes de lisibilité : réduction proportionnelle si trop grand,
  // agrandissement proportionnel si illisible (< 6 %) — l'aspect reste vrai.
  const excedent = Math.max(wPct / 92, hPct / 92)
  if (excedent > 1) {
    wPct /= excedent
    hPct /= excedent
  }
  const minCote = Math.min(wPct, hPct)
  if (minCote < 6) {
    const agrandissement = 6 / minCote
    wPct *= agrandissement
    hPct *= agrandissement
  }

  // Position : centrée dans la zone ; une sculpture est posée au bas de la zone.
  let x = zone.x + (zone.w - wPct) / 2
  let y =
    oeuvre.tag === 'sculpture' && zone.kind !== 'mur'
      ? zone.y + zone.h - hPct
      : zone.y + (zone.h - hPct) / 2
  x = clamp(x, 0, 100 - wPct)
  y = clamp(y, 0, 100 - hPct)

  return { rect: { x, y, w: wPct, h: hPct }, source }
}

/** Interpolation bilinéaire d'un point (u,v ∈ [0,1]) dans un quad [tl,tr,br,bl]. */
function bilineaire(q: QuadPct, u: number, v: number): PointPct {
  const [tl, tr, br, bl] = q
  const hautX = tl.x + u * (tr.x - tl.x)
  const hautY = tl.y + u * (tr.y - tl.y)
  const basX = bl.x + u * (br.x - bl.x)
  const basY = bl.y + u * (br.y - bl.y)
  return { x: hautX + v * (basX - hautX), y: hautY + v * (basY - hautY) }
}

/**
 * Quadrilatère de placement de l'œuvre (4 coins en %), en perspective.
 * Si le modèle a fourni un quad de zone, on y projette la sous-position de
 * l'œuvre (calculée par rectPourOeuvre) → l'œuvre suit les lignes de fuite.
 * Sinon repli sur les 4 coins du rect axis-aligné (collage à plat, mais œuvre
 * exacte et photo intacte garanties).
 */
export function quadPourOeuvre(
  analyse: AnalyseResult | null,
  oeuvre: Oeuvre,
  photoW: number,
  photoH: number
): PlacementQuad {
  const { rect, source } = rectPourOeuvre(analyse, oeuvre, photoW, photoH)
  const zone = analyse?.photo?.zones[0] ?? null
  const zoneQuad = zone?.quad ?? null

  // Perspective réservée aux œuvres murales : une sculpture reste droite (une
  // photo produit rectangulaire déformée au sol serait incorrecte).
  if (zone && zoneQuad && zone.kind === 'mur' && zone.w > 0 && zone.h > 0) {
    // Bornes larges : l'œuvre peut déborder de la zone (mur) si elle est plus
    // grande — on extrapole le plan du mur plutôt que de la brider.
    const u0 = clamp((rect.x - zone.x) / zone.w, -0.6, 1.6)
    const v0 = clamp((rect.y - zone.y) / zone.h, -0.6, 1.6)
    const u1 = clamp((rect.x + rect.w - zone.x) / zone.w, -0.6, 1.6)
    const v1 = clamp((rect.y + rect.h - zone.y) / zone.h, -0.6, 1.6)
    const quad: QuadPct = [
      bilineaire(zoneQuad, u0, v0),
      bilineaire(zoneQuad, u1, v0),
      bilineaire(zoneQuad, u1, v1),
      bilineaire(zoneQuad, u0, v1)
    ]
    return { quad, source: 'perspective' }
  }

  const quad: QuadPct = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h }
  ]
  return { quad, source: source === 'defaut' ? 'defaut' : 'plat' }
}
