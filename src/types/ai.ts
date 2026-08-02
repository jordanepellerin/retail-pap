// Types partagés du pipeline IA (client + fonctions serverless api/).
// Le schéma garantit la forme ; `sanitizeAnalyse` garantit le bon sens (bornes, listes).

import type { Oeuvre, Tag } from './index'

/** Rectangle en pourcentage de la photo (0–100). */
export interface RectPct {
  x: number
  y: number
  w: number
  h: number
}

/** Point en pourcentage de la photo (0–100). */
export interface PointPct {
  x: number
  y: number
}

/**
 * Quadrilatère de placement en perspective : les 4 coins où l'œuvre doit être
 * posée sur le mur/plan, dans l'ordre haut-gauche, haut-droit, bas-droit,
 * bas-gauche (% de la photo). Suit les lignes de fuite de la scène.
 */
export type QuadPct = [PointPct, PointPct, PointPct, PointPct]

/** Zone de placement proposée par l'analyse — zones[0] respecte le souhait de l'utilisateur. */
export interface PlacementZone extends RectPct {
  /** Libellé lisible, ex. « au-dessus de la cheminée ». */
  label: string
  /** Nature du support : mur (peintures), sol ou meuble (sculptures). */
  kind: 'mur' | 'sol' | 'meuble'
  /** Confiance du modèle, 0–1. */
  confidence: number
  /** 4 coins en perspective de cette zone (null si le modèle n'a pas su l'estimer). */
  quad: QuadPct | null
}

/** Volet « photo » de l'analyse (null si aucune photo fournie). */
export interface AnalysePhoto {
  zones: PlacementZone[]
  /** Échelle estimée au plan de placement : pixels de la photo analysée par centimètre réel. */
  pxPerCm: number | null
  /**
   * Largeur réelle (cm) du plan de zones[0] — typiquement le mur mesuré par le
   * client. Le code en déduit l'échelle exacte (largeur de la zone en px ÷ cette
   * valeur), plus fiable qu'un pxPerCm abstrait. null si non déterminable.
   */
  planLargeurCm: number | null
  /** Origine de l'échelle, ex. « canapé 200 cm indiqué par l'utilisateur ». */
  scaleSource: string | null
  lumiere: string
  styleInterieur: string[]
  couleursDominantes: string[]
}

/** Volet « intention » : normalisation des textes libres dans NOTRE vocabulaire. */
export interface AnalyseIntent {
  /** Uniquement des noms exacts issus de ARTISTES (catalogue). */
  artistes: string[]
  /** Uniquement des termes issus de VOCABULAIRE_MOTS_CLES (catalogue). */
  motsCles: string[]
  /** Sujets libres détectés (ex. « homme qui marche »), pour le scoring doux. */
  sujets: string[]
  tailleSouhaitee: 'petite' | 'moyenne' | 'grande' | null
  couleurs: string[]
}

/** Résultat structuré de l'appel d'analyse (Gemini Flash, JSON `responseSchema`). */
export interface AnalyseResult {
  photo: AnalysePhoto | null
  intent: AnalyseIntent
  /** Confiance globale, 0–1. */
  confiance: number
}

// ─── Contrats des endpoints ────────────────────────────────────────────────

export interface AnalyzeRequest {
  type: Tag
  recherche: string
  description: string
  /** dataURL JPEG/PNG/WebP ≤ 1280 px côté long, ou null (analyse texte seul). */
  photo: string | null
}
export type AnalyzeResponse = { ok: true; result: AnalyseResult } | { ok: false; error: string }

export interface RenderRequest {
  /** dataURL : photo ORIGINALE de l'espace (jamais pré-composée) — le modèle y place l'œuvre. */
  photo: string
  /** dataURL : l'œuvre seule à intégrer (référence de fidélité), ≤ 768 px. */
  artwork: string
  kind: Tag
  /** Où poser l'œuvre — texte libre du client, ex. « sur le mur noir du milieu ». */
  placement: string
  /** Largeur réelle du plan de pose en cm (mur/support), null si inconnue. */
  planLargeurCm: number | null
  /** Hauteur réelle de l'œuvre en cm, null si inconnue. */
  hauteurCm: number | null
  /** Largeur réelle de l'œuvre en cm, null si inconnue. */
  largeurCm: number | null
  /**
   * Taille cible calculée par le CODE à partir de l'échelle réelle (px/cm)
   * estimée à l'analyse : hauteur/largeur de l'œuvre en % de l'image. null si
   * l'échelle n'est pas fiable — on laisse alors le modèle estimer sur repères.
   */
  cibleHauteurPct: number | null
  cibleLargeurPct: number | null
  /** Notes d'éclairage/style issues de l'analyse, ex. « lumière latérale douce ». */
  notes: string
}
export type RenderResponse = { ok: true; image: string } | { ok: false; error: string }

/** Œuvre classée par le scoring code (matching.ts). */
export interface MatchResult {
  oeuvre: Oeuvre
  score: number
  /** Justifications FR affichées en badges, ex. « Aux proportions de votre mur ». */
  raisons: string[]
}

/** Justification rédigée par l'IA pour un artiste retenu. */
export interface ArtisteJustification {
  /** Nom exact de l'artiste (liste blanche du catalogue). */
  artiste: string
  /** Une ou deux phrases reliant l'artiste à la demande du client. */
  phrase: string
}

/**
 * Résultat de l'étape « présentation des artistes » : reformulation IA de la
 * demande du client + une justification par artiste retenu. Généré après le
 * matching (l'IA connaît alors les artistes sélectionnés).
 */
export interface JustifyResult {
  /** Reformulation fidèle et élégante du projet décrit par le client. */
  reformulation: string
  justifications: ArtisteJustification[]
}

export interface JustifyRequest {
  type: Tag
  recherche: string
  description: string
  /** Noms d'artistes retenus par le matching, dans l'ordre de classement. */
  artistes: string[]
}
export type JustifyResponse = { ok: true; result: JustifyResult } | { ok: false; error: string }

// ─── Plafonds partagés client/serveur ──────────────────────────────────────

export const RECHERCHE_MAX = 300
export const DESCRIPTION_MAX = 500
/** Taille max acceptée pour un body JSON (marge sous la limite Vercel de 4,5 Mo). */
export const BODY_MAX_BYTES = 3.5 * 1024 * 1024

// ─── Garde-fous : validation tolérante + bornage ───────────────────────────

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
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, maxLen)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function sanitizePoint(v: unknown): PointPct | null {
  if (!isRecord(v)) return null
  const x = asNumber(v.x)
  const y = asNumber(v.y)
  if (x === null || y === null) return null
  return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) }
}

function sanitizeQuad(v: unknown): QuadPct | null {
  if (!Array.isArray(v) || v.length !== 4) return null
  const pts = v.map(sanitizePoint)
  if (pts.some((p) => p === null)) return null
  const [tl, tr, br, bl] = pts as PointPct[]
  // Garde-fou : quad dégénéré (aire quasi nulle) → on l'ignore (repli sur le rect).
  const aire =
    Math.abs((tr.x - tl.x) * (bl.y - tl.y) - (tr.y - tl.y) * (bl.x - tl.x)) +
    Math.abs((br.x - tr.x) * (br.y - bl.y) - (br.y - tr.y) * (br.x - bl.x))
  if (aire < 20) return null
  return [tl, tr, br, bl]
}

function sanitizeZone(v: unknown): PlacementZone | null {
  if (!isRecord(v)) return null
  const x = asNumber(v.x)
  const y = asNumber(v.y)
  const w = asNumber(v.w)
  const h = asNumber(v.h)
  if (x === null || y === null || w === null || h === null) return null
  const kind = v.kind === 'mur' || v.kind === 'sol' || v.kind === 'meuble' ? v.kind : 'mur'
  const zone: PlacementZone = {
    x: clamp(x, 0, 99),
    y: clamp(y, 0, 99),
    w: clamp(w, 1, 100),
    h: clamp(h, 1, 100),
    label: asString(v.label),
    kind,
    confidence: clamp(asNumber(v.confidence) ?? 0.5, 0, 1),
    quad: sanitizeQuad(v.quad)
  }
  // La zone doit rester dans l'image.
  zone.w = Math.min(zone.w, 100 - zone.x)
  zone.h = Math.min(zone.h, 100 - zone.y)
  return zone
}

/**
 * Transforme une sortie inconnue (modèle ou réseau) en `AnalyseResult` sûr, ou null.
 * Le filtrage des artistes/mots-clés sur les listes blanches du catalogue est fait
 * par l'appelant (évite d'importer le catalogue ici).
 */
export function sanitizeAnalyse(value: unknown): AnalyseResult | null {
  if (!isRecord(value)) return null
  const intentRaw = isRecord(value.intent) ? value.intent : {}
  const taille = intentRaw.tailleSouhaitee
  const intent: AnalyseIntent = {
    artistes: asStringArray(intentRaw.artistes, 4),
    motsCles: asStringArray(intentRaw.motsCles),
    sujets: asStringArray(intentRaw.sujets),
    tailleSouhaitee:
      taille === 'petite' || taille === 'moyenne' || taille === 'grande' ? taille : null,
    couleurs: asStringArray(intentRaw.couleurs, 6)
  }

  let photo: AnalysePhoto | null = null
  if (isRecord(value.photo)) {
    const zones = (Array.isArray(value.photo.zones) ? value.photo.zones : [])
      .map(sanitizeZone)
      .filter((z): z is PlacementZone => z !== null)
      .slice(0, 3)
    const pxPerCm = asNumber(value.photo.pxPerCm)
    const planCm = asNumber(value.photo.planLargeurCm)
    photo = {
      zones,
      // Échelle plausible : 0,5–200 px/cm sur une photo ≤ 1280 px, sinon rejet.
      pxPerCm: pxPerCm !== null && pxPerCm >= 0.5 && pxPerCm <= 200 ? pxPerCm : null,
      // Largeur de mur plausible : 20 cm à 20 m.
      planLargeurCm: planCm !== null && planCm >= 20 && planCm <= 2000 ? planCm : null,
      scaleSource: asString(value.photo.scaleSource) || null,
      lumiere: asString(value.photo.lumiere),
      styleInterieur: asStringArray(value.photo.styleInterieur, 6),
      couleursDominantes: asStringArray(value.photo.couleursDominantes, 6)
    }
  }

  return { photo, intent, confiance: clamp(asNumber(value.confiance) ?? 0.5, 0, 1) }
}

/**
 * Transforme une sortie inconnue (modèle ou réseau) en `JustifyResult` sûr, ou
 * null. Le filtrage des noms d'artistes sur la liste blanche du catalogue est
 * fait par l'appelant (évite d'importer le catalogue ici).
 */
export function sanitizeJustify(value: unknown): JustifyResult | null {
  if (!isRecord(value)) return null
  const brut = Array.isArray(value.justifications) ? value.justifications : []
  const justifications: ArtisteJustification[] = brut
    .map((j): ArtisteJustification | null => {
      if (!isRecord(j)) return null
      const artiste = asString(j.artiste)
      const phrase = asString(j.phrase)
      if (!artiste || !phrase) return null
      return { artiste, phrase: phrase.slice(0, 400) }
    })
    .filter((j): j is ArtisteJustification => j !== null)
    .slice(0, 8)
  const reformulation = asString(value.reformulation).slice(0, 500)
  if (!reformulation && justifications.length === 0) return null
  return { reformulation, justifications }
}

/** dataURL d'image acceptée par les endpoints (JPEG/PNG/WebP base64). */
export function isImageDataUrl(v: unknown): v is string {
  return typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)
}
