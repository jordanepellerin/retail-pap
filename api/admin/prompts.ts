// GET/POST /api/admin/prompts — lecture et édition des prompts du pipeline IA.
// Outil interne mono-admin : mot de passe partagé (header x-admin-password)
// comparé en temps constant, + throttle IP générique. Pas de session.

import { createHash, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { repondre, throttle } from '../_lib/validate.js'
import { DEFAULT_PROMPT_CONFIG, getPromptConfig, writePromptConfig } from '../_lib/promptStore.js'
import {
  ANALYZE_INSTRUCTIONS_MAX,
  RENDER_INSTRUCTIONS_MAX,
  BRIEF_INSTRUCTIONS_MAX,
  type PromptConfig
} from '../../src/types/admin.js'

type Acces = 'ok' | 'non-configure' | 'invalide'

function verifierAcces(req: VercelRequest): Acces {
  // Le trim absorbe un espace/saut de ligne parasite collé dans la variable Vercel.
  const attendu = process.env.ADMIN_PASSWORD?.trim()
  if (!attendu) return 'non-configure'
  const recuBrut = req.headers['x-admin-password']
  const recu = typeof recuBrut === 'string' ? recuBrut.trim() : ''
  if (!recu) return 'invalide'
  // Digests de longueur fixe → timingSafeEqual utilisable quel que soit l'input.
  const a = createHash('sha256').update(recu).digest()
  const b = createHash('sha256').update(attendu).digest()
  return timingSafeEqual(a, b) ? 'ok' : 'invalide'
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!throttle(req, res)) return
  const acces = verifierAcces(req)
  if (acces === 'non-configure') {
    repondre(res, 503, {
      ok: false,
      error:
        'ADMIN_PASSWORD absente côté serveur : ajoutez-la dans Vercel (Production) puis redéployez.'
    })
    return
  }
  if (acces === 'invalide') {
    repondre(res, 401, { ok: false, error: 'Mot de passe administrateur invalide.' })
    return
  }

  if (req.method === 'GET') {
    const config = await getPromptConfig()
    repondre(res, 200, { ok: true, config, defaults: DEFAULT_PROMPT_CONFIG })
    return
  }

  if (req.method !== 'POST') {
    repondre(res, 405, { ok: false, error: 'Méthode non autorisée.' })
    return
  }

  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    repondre(res, 400, { ok: false, error: 'Requête invalide.' })
    return
  }
  const b = body as Record<string, unknown>
  const analyze = typeof b.analyzeInstructions === 'string' ? b.analyzeInstructions.trim() : ''
  const render = typeof b.renderInstructions === 'string' ? b.renderInstructions.trim() : ''
  const brief = typeof b.briefInstructions === 'string' ? b.briefInstructions.trim() : ''
  if (!analyze || analyze.length > ANALYZE_INSTRUCTIONS_MAX) {
    repondre(res, 400, {
      ok: false,
      error: `Instructions d'analyse vides ou trop longues (max ${ANALYZE_INSTRUCTIONS_MAX} caractères).`
    })
    return
  }
  if (!render || render.length > RENDER_INSTRUCTIONS_MAX) {
    repondre(res, 400, {
      ok: false,
      error: `Instructions d'essayage vides ou trop longues (max ${RENDER_INSTRUCTIONS_MAX} caractères).`
    })
    return
  }
  if (!brief || brief.length > BRIEF_INSTRUCTIONS_MAX) {
    repondre(res, 400, {
      ok: false,
      error: `Instructions de reformulation vides ou trop longues (max ${BRIEF_INSTRUCTIONS_MAX} caractères).`
    })
    return
  }
  const config: PromptConfig = {
    analyzeInstructions: analyze,
    renderInstructions: render,
    briefInstructions: brief
  }
  const resultat = await writePromptConfig(config)
  if (!resultat.ok) {
    repondre(res, 502, resultat)
    return
  }
  repondre(res, 200, { ok: true, config })
}
