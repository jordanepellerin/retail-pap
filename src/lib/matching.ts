// Matching catalogue 100 % code (0 $) — croise le type choisi, les artistes
// détectés/nommés, l'intention normalisée par l'analyse IA et l'échelle réelle
// estimée de la photo pour classer les œuvres avec des justifications FR.

import type { Oeuvre, Tag, WidgetState } from '../types'
import type { AnalyseResult, MatchResult, PlacementZone } from '../types/ai'
import { CATALOGUE } from '../data/catalogue'
import { detectArtistes, normaliser } from './artistMatch'

export interface MatchContext {
  type: Tag
  /** Restriction dure : vide = tous les artistes. */
  artistes: string[]
  motsCles: string[]
  sujets: string[]
  couleurs: string[]
  tailleSouhaitee: 'petite' | 'moyenne' | 'grande' | null
  /** Zone de placement retenue (zones[0] de l'analyse) et sa taille réelle estimée. */
  zone: PlacementZone | null
  zoneCm: { w: number; h: number } | null
}

/**
 * Construit le contexte de matching depuis l'état du widget.
 * Les artistes détectés en code dans la recherche priment sur l'analyse IA
 * (`analyseOverride` permet d'utiliser un résultat pas encore dispatché).
 */
export function buildMatchContext(
  state: WidgetState,
  analyseOverride?: AnalyseResult | null
): MatchContext {
  const analyse = analyseOverride !== undefined ? analyseOverride : state.analyse
  const intent = analyse?.intent
  const artistesCode = detectArtistes(state.recherche)
  const artistes = artistesCode.length > 0 ? artistesCode : (intent?.artistes ?? [])

  const zone = analyse?.photo?.zones[0] ?? null
  const pxPerCm = analyse?.photo?.pxPerCm ?? null
  let zoneCm: { w: number; h: number } | null = null
  if (zone && pxPerCm && state.photoMeta) {
    zoneCm = {
      w: ((zone.w / 100) * state.photoMeta.w) / pxPerCm,
      h: ((zone.h / 100) * state.photoMeta.h) / pxPerCm
    }
  }

  return {
    type: state.type ?? 'sculpture',
    artistes,
    motsCles: intent?.motsCles ?? [],
    sujets: intent?.sujets ?? [],
    couleurs: intent?.couleurs ?? [],
    tailleSouhaitee: intent?.tailleSouhaitee ?? null,
    zone,
    zoneCm
  }
}

/** Plus grande dimension connue de l'œuvre (cm), pour les bandes de taille. */
function dimMax(o: Oeuvre): number | null {
  const vals = [o.dims.h, o.dims.l].filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

function bandeTaille(o: Oeuvre): 'petite' | 'moyenne' | 'grande' | null {
  const d = dimMax(o)
  if (d === null) return null
  if (d < 60) return 'petite'
  if (d <= 120) return 'moyenne'
  return 'grande'
}

/** Score d'adéquation dimensionnelle (0–40), ou null si l'œuvre ne tient pas (> 120 %). */
function scoreTaille(o: Oeuvre, ctx: MatchContext): { pts: number; raison: string | null } | null {
  if (!ctx.zoneCm) return { pts: 0, raison: null }
  if (o.tag === 'peinture') {
    const larg = o.dims.l ?? o.dims.h
    if (larg === null || ctx.zoneCm.w <= 0) return { pts: 0, raison: null }
    const ratio = larg / ctx.zoneCm.w
    if (ratio > 1.2) return null // ne tient physiquement pas dans la zone
    if (ratio >= 0.55 && ratio <= 0.9) return { pts: 40, raison: 'Aux proportions de votre mur' }
    if (ratio >= 0.35) return { pts: 20, raison: null }
    return { pts: 0, raison: null }
  }
  // Sculpture : hauteur vs hauteur disponible de la zone.
  const haut = o.dims.h
  if (haut === null || ctx.zoneCm.h <= 0) return { pts: 0, raison: null }
  const ratio = haut / ctx.zoneCm.h
  if (ratio > 1.2) return null
  if (ratio >= 0.4 && ratio <= 0.9) return { pts: 40, raison: "Adaptée à l'espace disponible" }
  if (ratio >= 0.25) return { pts: 20, raison: null }
  return { pts: 0, raison: null }
}

/**
 * Classe le catalogue selon le contexte. Filtres durs : type, artistes nommés,
 * œuvre physiquement trop grande. Scores doux : taille, format souhaité,
 * thèmes, couleurs. Contexte vide → ordre du catalogue, scores nuls (repli).
 */
export function rankCatalogue(ctx: MatchContext): MatchResult[] {
  const artistesNorm = ctx.artistes.map(normaliser)
  const termes = [...ctx.motsCles, ...ctx.sujets].map(normaliser).filter(Boolean)
  const couleursNorm = ctx.couleurs.map(normaliser)

  const resultats: MatchResult[] = []
  for (const o of CATALOGUE) {
    if (o.tag !== ctx.type) continue
    if (artistesNorm.length > 0 && !artistesNorm.includes(normaliser(o.artiste))) continue

    const taille = scoreTaille(o, ctx)
    if (taille === null) continue // trop grande pour la zone mesurée

    let score = taille.pts
    const raisons: string[] = []
    if (taille.raison) raisons.push(taille.raison)
    if (artistesNorm.length > 0) raisons.push('Artiste demandé')

    if (ctx.tailleSouhaitee && bandeTaille(o) === ctx.tailleSouhaitee) {
      score += 15
      raisons.push(`Format ${ctx.tailleSouhaitee} comme souhaité`)
    }

    // Thèmes : mots-clés + sujets vs vocabulaire, titre et description de l'œuvre.
    const corpus = normaliser(`${o.motsCles.join(' ')} ${o.titre} ${o.descriptionCourte}`)
    let hits = 0
    for (const terme of termes) {
      if (corpus.includes(terme)) {
        hits += 1
        if (raisons.length < 4) raisons.push(`Thème : ${terme}`)
      }
    }
    score += Math.min(30, hits * 10)

    // Couleurs : accord entre les souhaits/l'intérieur et la palette de l'œuvre.
    const paletteNorm = o.couleurs.map(normaliser)
    const accords = couleursNorm.filter((c) => paletteNorm.includes(c)).length
    if (accords > 0) {
      score += Math.min(10, accords * 5)
      raisons.push('Palette en harmonie')
    }

    resultats.push({ oeuvre: o, score, raisons: [...new Set(raisons)] })
  }

  // Tri stable : à score égal, l'ordre du catalogue est conservé.
  return resultats
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.score - a.r.score || a.i - b.i)
    .map(({ r }) => r)
}
