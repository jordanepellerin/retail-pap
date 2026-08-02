// Garde-fous des endpoints publics : méthode, taille de body, throttle mémoire
// best-effort (un vrai rate-limit nécessiterait un KV — hors périmètre démo).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { BODY_MAX_BYTES } from '../../src/types/ai.js'

/** Réponse JSON typée — les endpoints ne renvoient jamais de HTML. */
export function repondre(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.json(body)
}

/**
 * Vérifie méthode POST, taille du body et présence d'un objet JSON.
 * Renvoie le body ou null (la réponse d'erreur est déjà émise).
 */
export function lireBody(req: VercelRequest, res: VercelResponse): Record<string, unknown> | null {
  if (req.method !== 'POST') {
    repondre(res, 405, { ok: false, error: 'Méthode non autorisée.' })
    return null
  }
  const taille = Number(req.headers['content-length'] ?? 0)
  if (taille > BODY_MAX_BYTES) {
    repondre(res, 413, { ok: false, error: 'Image trop lourde — réessayez avec une photo plus légère.' })
    return null
  }
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    repondre(res, 400, { ok: false, error: 'Requête invalide.' })
    return null
  }
  return body as Record<string, unknown>
}

// Throttle par IP : 20 requêtes/minute, best-effort (mémoire de l'instance).
const FENETRE_MS = 60_000
const MAX_PAR_FENETRE = 20
const compteurs = new Map<string, { n: number; reset: number }>()

export function throttle(req: VercelRequest, res: VercelResponse): boolean {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : null) ?? req.socket.remoteAddress ?? 'inconnu'
  const now = Date.now()
  const entree = compteurs.get(ip)
  if (!entree || entree.reset < now) {
    compteurs.set(ip, { n: 1, reset: now + FENETRE_MS })
    return true
  }
  entree.n += 1
  if (entree.n > MAX_PAR_FENETRE) {
    repondre(res, 429, { ok: false, error: 'Trop de requêtes — patientez un instant.' })
    return false
  }
  return true
}
