// Client des endpoints IA — timeouts stricts, caches par hash (1 analyse par
// demande, 1 rendu par photo×tenue, idempotent y compris en StrictMode),
// et échec silencieux : null → le widget dégrade vers le comportement code.

import type {
  AnalyseResult,
  AnalyzeRequest,
  AnalyzeResponse,
  BriefRequest,
  BriefResponse,
  BriefResult,
  RenderRequest,
  RenderResponse
} from '../types/ai'
import { sanitizeAnalyse, sanitizeBrief } from '../types/ai'
import { sha256 } from './image'

// L'analyse et le brief sont deux appels texte courts ; le rendu image est le
// seul long, sous la limite de 60 s des fonctions Vercel.
const ANALYSE_TIMEOUT_MS = 25_000
const BRIEF_TIMEOUT_MS = 25_000
const RENDU_TIMEOUT_MS = 55_000

const cacheAnalyse = new Map<string, AnalyseResult>()
const cacheBrief = new Map<string, BriefResult>()
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

/** Déduplique les appels identiques en vol (StrictMode monte deux fois). */
async function unique<T>(cle: string, executer: () => Promise<T | null>): Promise<T | null> {
  const enCours = enVol.get(cle) as Promise<T | null> | undefined
  if (enCours) return enCours
  const promesse = executer()
  enVol.set(cle, promesse)
  try {
    return await promesse
  } finally {
    enVol.delete(cle)
  }
}

/**
 * Extraction d'intention depuis la demande libre. Renvoie null en cas d'échec
 * (le classement continue alors sur la seule intention détectée en code).
 */
export async function analyser(req: AnalyzeRequest): Promise<AnalyseResult | null> {
  const cle = `analyse:${await sha256(req.demande)}`
  const connue = cacheAnalyse.get(cle)
  if (connue) return connue

  return unique(cle, async () => {
    const json = await postJson<AnalyzeResponse>('/api/analyze', req, ANALYSE_TIMEOUT_MS)
    if (!json || !json.ok) return null
    // Re-validation côté client : ne jamais faire confiance au réseau.
    const propre = sanitizeAnalyse(json.result)
    if (propre) cacheAnalyse.set(cle, propre)
    return propre
  })
}

/**
 * Reformulation du besoin. Renvoie null en cas d'échec (l'écran retombe alors
 * sur la reformulation 100 % code, `lib/brief.ts`).
 */
export async function reformuler(req: BriefRequest): Promise<BriefResult | null> {
  const cle = `brief:${await sha256(JSON.stringify([req.demande, req.criteres, req.categories]))}`
  const connue = cacheBrief.get(cle)
  if (connue) return connue

  return unique(cle, async () => {
    const json = await postJson<BriefResponse>('/api/brief', req, BRIEF_TIMEOUT_MS)
    if (!json || !json.ok) return null
    const propre = sanitizeBrief(json.result)
    if (propre) cacheBrief.set(cle, propre)
    return propre
  })
}

/**
 * Essayage virtuel : la photo du visiteur + les pièces de sa tenue.
 * Renvoie la dataURL de l'image générée, ou null (la planche de la tenue reste
 * alors affichée). Un seul rendu par photo × composition de tenue.
 */
export async function rendre(req: RenderRequest): Promise<string | null> {
  const cle = `rendu:${await sha256(
    JSON.stringify([req.photo, req.articles.map((a) => [a.slots, a.description]), req.notes])
  )}`
  const connue = cacheRendu.get(cle)
  if (connue) return connue

  return unique(cle, async () => {
    const json = await postJson<RenderResponse>('/api/render', req, RENDU_TIMEOUT_MS)
    if (!json || !json.ok || !json.image.startsWith('data:image/')) return null
    cacheRendu.set(cle, json.image)
    return json.image
  })
}
