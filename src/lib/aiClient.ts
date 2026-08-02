// Client des endpoints IA — timeouts stricts, caches par hash (1 analyse par
// photo+textes, 1 rendu par œuvre×photo, idempotent y compris en StrictMode),
// et échec silencieux : null → le widget dégrade vers le comportement mock.

import type {
  AnalyseResult,
  AnalyzeRequest,
  AnalyzeResponse,
  JustifyRequest,
  JustifyResponse,
  JustifyResult,
  RenderRequest,
  RenderResponse
} from '../types/ai'
import { sanitizeAnalyse, sanitizeJustify } from '../types/ai'
import { sha256 } from './image'

// Gemini 3.1 Pro (analyse) raisonne davantage que Flash : marge de temps plus
// large, sous la limite de 60 s des fonctions Vercel.
const ANALYSE_TIMEOUT_MS = 45_000
const RENDU_TIMEOUT_MS = 55_000
// La justification est un appel texte court : plafond de temps plus serré.
const JUSTIFY_TIMEOUT_MS = 30_000

const cacheAnalyse = new Map<string, AnalyseResult>()
const cacheJustify = new Map<string, JustifyResult>()
const cacheRendu = new Map<string, string>()
// Requêtes en vol : un second appel identique attend la première réponse.
const enVol = new Map<string, Promise<unknown>>()

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null // réseau coupé, timeout, JSON invalide → dégradation gracieuse
  }
}

/**
 * Analyse photo + intention. Renvoie null en cas d'échec (le matching
 * continue alors en pur code). Une seule requête par combinaison d'entrées.
 */
export async function analyser(req: AnalyzeRequest): Promise<AnalyseResult | null> {
  const cle = await sha256(JSON.stringify([req.type, req.recherche, req.description, req.photo]))
  const connue = cacheAnalyse.get(cle)
  if (connue) return connue

  const enCours = enVol.get(cle) as Promise<AnalyseResult | null> | undefined
  if (enCours) return enCours

  const promesse = (async () => {
    const json = await postJson<AnalyzeResponse>('/api/analyze', req, ANALYSE_TIMEOUT_MS)
    if (!json || !json.ok) return null
    // Re-validation côté client : ne jamais faire confiance au réseau.
    const propre = sanitizeAnalyse(json.result)
    if (propre) cacheAnalyse.set(cle, propre)
    return propre
  })()
  enVol.set(cle, promesse)
  try {
    return await promesse
  } finally {
    enVol.delete(cle)
  }
}

/**
 * Reformulation de la demande + justification par artiste (étape « présentation
 * des artistes »). Renvoie null en cas d'échec (l'écran retombe alors sur des
 * justifications 100 % code). Une seule requête par combinaison d'entrées.
 */
export async function justifier(req: JustifyRequest): Promise<JustifyResult | null> {
  const cle = await sha256(
    JSON.stringify([req.type, req.recherche, req.description, req.artistes])
  )
  const connue = cacheJustify.get(cle)
  if (connue) return connue

  const enCours = enVol.get(cle) as Promise<JustifyResult | null> | undefined
  if (enCours) return enCours

  const promesse = (async () => {
    const json = await postJson<JustifyResponse>('/api/justify', req, JUSTIFY_TIMEOUT_MS)
    if (!json || !json.ok) return null
    // Re-validation côté client : ne jamais faire confiance au réseau.
    const propre = sanitizeJustify(json.result)
    if (propre) cacheJustify.set(cle, propre)
    return propre
  })()
  enVol.set(cle, promesse)
  try {
    return await promesse
  } finally {
    enVol.delete(cle)
  }
}

/**
 * Intégration de l'œuvre dans la photo par le modèle image (Nano Banana Pro).
 * Renvoie la dataURL de l'image, ou null (l'overlay code reste alors affiché).
 * Un seul rendu par œuvre×photo×placement.
 */
export async function rendre(req: RenderRequest): Promise<string | null> {
  const cle = await sha256(
    JSON.stringify([
      req.photo,
      req.artwork,
      req.kind,
      req.placement,
      req.planLargeurCm,
      req.hauteurCm,
      req.largeurCm,
      req.cibleHauteurPct,
      req.cibleLargeurPct
    ])
  )
  const connue = cacheRendu.get(cle)
  if (connue) return connue

  const enCours = enVol.get(cle) as Promise<string | null> | undefined
  if (enCours) return enCours

  const promesse = (async () => {
    const json = await postJson<RenderResponse>('/api/render', req, RENDU_TIMEOUT_MS)
    if (!json || !json.ok || !json.image.startsWith('data:image/')) return null
    cacheRendu.set(cle, json.image)
    return json.image
  })()
  enVol.set(cle, promesse)
  try {
    return await promesse
  } finally {
    enVol.delete(cle)
  }
}
