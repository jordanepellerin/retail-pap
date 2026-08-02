// Types partagés du pipeline IA (client + fonctions serverless api/).
// Le schéma garantit la forme ; `sanitize*` garantit le bon sens (bornes, listes).

import type { Article, Categorie, Coupe, Intention, Occasion, Slot } from './index'

/** Résultat structuré de l'appel d'analyse (sortie JSON `responseSchema`). */
export interface AnalyseResult {
  intent: Intention
  /** Confiance globale, 0–1. */
  confiance: number
}

/**
 * Reformulation du besoin par le conseiller, affichée à l'étape `brief` avant
 * de dérouler la sélection. `conseil` est une phrase courte de parti pris.
 */
export interface BriefResult {
  reformulation: string
  conseil: string
}

// ─── Contrats des endpoints ────────────────────────────────────────────────

export interface AnalyzeRequest {
  /** Demande libre du visiteur, telle qu'il l'a écrite. */
  demande: string
}
export type AnalyzeResponse = { ok: true; result: AnalyseResult } | { ok: false; error: string }

export interface BriefRequest {
  demande: string
  /** Critères retenus en clair, ex. « Occasion : mariage », « Matière : lin ». */
  criteres: string[]
  /** Catégories que la sélection va proposer. */
  categories: Categorie[]
}
export type BriefResponse = { ok: true; result: BriefResult } | { ok: false; error: string }

/** Une pièce à faire porter à la personne photographiée. */
export interface RenderArticle {
  /** dataURL du visuel produit (≤ 768 px) — référence de fidélité. */
  image: string
  /** Emplacements remplacés sur la silhouette — un costume en couvre deux. */
  slots: Slot[]
  /** Description textuelle de la pièce, ex. « un pantalon en flanelle gris anthracite ». */
  description: string
}

export interface RenderRequest {
  /** dataURL : photo ORIGINALE du visiteur — le modèle l'édite, ne la recrée pas. */
  photo: string
  /** Les pièces à essayer, 1 à 8. */
  articles: RenderArticle[]
  /** Notes de style transmises au modèle (ex. « tenue de mariage en extérieur »). */
  notes: string
}
export type RenderResponse = { ok: true; image: string } | { ok: false; error: string }

/** Article classé par le scoring code (matching.ts). */
export interface MatchResult {
  article: Article
  score: number
  /** Justifications FR affichées en badges, ex. « Lin, comme souhaité ». */
  raisons: string[]
}

// ─── Plafonds partagés client/serveur ──────────────────────────────────────

export const DEMANDE_MAX = 400
export const MESSAGE_MAX = 500
/** Nombre maximum de pièces envoyées au rendu (aligné sur TENUE_MAX). */
export const RENDER_ARTICLES_MAX = 8
/** Taille max acceptée pour un body JSON (marge sous la limite Vercel de 4,5 Mo). */
export const BODY_MAX_BYTES = 3.5 * 1024 * 1024

// ─── Garde-fous : validation tolérante + bornage ───────────────────────────

const CATEGORIES: readonly Categorie[] = [
  'costume',
  'veste',
  'pantalon',
  'chemise',
  'maille',
  'chaussures',
  'accessoire'
]

const OCCASIONS: readonly Occasion[] = [
  'mariage-invite',
  'mariage-marie',
  'bureau',
  'soiree',
  'ceremonie',
  'quotidien'
]

const COUPES: readonly Coupe[] = ['slim', 'tailored', 'regular']

export const SLOTS: readonly Slot[] = [
  'torse-exterieur',
  'torse-interieur',
  'jambes',
  'pieds',
  'cou',
  'taille',
  'poche',
  'poignet'
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function asStringArray(v: unknown, maxLen = 12): string[] {
  if (!Array.isArray(v)) return []
  return [
    ...new Set(
      v
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    )
  ].slice(0, maxLen)
}

/** Ne garde que les valeurs appartenant à une union fermée. */
function asEnumArray<T extends string>(v: unknown, valides: readonly T[], maxLen = 8): T[] {
  return asStringArray(v, maxLen).filter((x): x is T => (valides as readonly string[]).includes(x))
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Transforme une sortie inconnue (modèle ou réseau) en `AnalyseResult` sûr, ou
 * null. Le filtrage des matières/couleurs sur les vocabulaires du catalogue est
 * fait par l'appelant (évite d'importer le catalogue ici).
 */
export function sanitizeAnalyse(value: unknown): AnalyseResult | null {
  if (!isRecord(value)) return null
  const brut = isRecord(value.intent) ? value.intent : {}
  const budget = asNumber(brut.budgetMax)
  const coupe = typeof brut.coupe === 'string' ? brut.coupe : ''
  const intent: Intention = {
    categories: asEnumArray(brut.categories, CATEGORIES),
    occasions: asEnumArray(brut.occasions, OCCASIONS),
    matieres: asStringArray(brut.matieres, 6),
    couleurs: asStringArray(brut.couleurs, 6),
    // Budget plausible pour du prêt-à-porter : 30 € à 20 000 €.
    budgetMax: budget !== null && budget >= 30 && budget <= 20_000 ? Math.round(budget) : null,
    coupe: (COUPES as readonly string[]).includes(coupe) ? (coupe as Coupe) : null,
    motsCles: asStringArray(brut.motsCles, 10)
  }
  return { intent, confiance: clamp(asNumber(value.confiance) ?? 0.5, 0, 1) }
}

/** Transforme une sortie inconnue en `BriefResult` sûr, ou null. */
export function sanitizeBrief(value: unknown): BriefResult | null {
  if (!isRecord(value)) return null
  const reformulation = asString(value.reformulation).slice(0, 400)
  const conseil = asString(value.conseil).slice(0, 300)
  if (!reformulation) return null
  return { reformulation, conseil }
}

/** dataURL d'image acceptée par les endpoints (JPEG/PNG/WebP base64). */
export function isImageDataUrl(v: unknown): v is string {
  return typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)
}

/** Valide une pièce du rendu venue du réseau (image, emplacements, description). */
export function sanitizeRenderArticle(value: unknown): RenderArticle | null {
  if (!isRecord(value)) return null
  if (!isImageDataUrl(value.image)) return null
  const slots = asEnumArray(value.slots, SLOTS, 4)
  if (slots.length === 0) return null
  const description = asString(value.description).slice(0, 300)
  if (!description) return null
  return { image: value.image, slots, description }
}
