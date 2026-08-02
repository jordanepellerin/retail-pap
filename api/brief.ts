// POST /api/brief — reformule le besoin du client et ajoute une phrase de
// conseil, en UN appel à sortie JSON. Appelé APRÈS le classement (le code a
// déjà retenu les critères) : l'IA se concentre sur la formulation.
// Sans clé API, renvoie une erreur propre → repli sur `src/lib/brief.ts`.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Type, type Schema } from '@google/genai'
import { getGemini, ANALYZE_MODEL, ANALYZE_MODEL_FALLBACK } from './_lib/gemini.js'
import { lireBody, repondre, throttle } from './_lib/validate.js'
import { applyTemplate, getPromptConfig } from './_lib/promptStore.js'
import { sanitizeBrief, DEMANDE_MAX } from '../src/types/ai.js'
import { LIBELLES_CATEGORIE, ORDRE_CATEGORIES } from '../src/data/catalogue.js'
import type { Categorie } from '../src/types/index.js'

// Schéma de sortie structuré — miroir de BriefResult (src/types/ai.ts).
const briefSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reformulation: {
      type: Type.STRING,
      description: 'Reformulation fidèle du besoin, en une phrase adressée au client.'
    },
    conseil: {
      type: Type.STRING,
      description: 'Une phrase de parti pris de conseiller, liée à la demande.'
    }
  },
  required: ['reformulation', 'conseil']
}

/**
 * Le squelette (rôle, écho de la demande et des critères) reste dans le code ;
 * seule la section « TÂCHES » vient du store (éditable depuis /admin).
 */
function construirePrompt(
  instructions: string,
  demande: string,
  criteres: string[],
  categories: Categorie[]
): string {
  const familles = categories.map((c) => LIBELLES_CATEGORIE[c].pluriel).join(', ')
  const listeCriteres = criteres.map((c) => `- ${c}`).join('\n')
  const taches = applyTemplate(instructions, {
    DEMANDE: demande,
    CRITERES: listeCriteres,
    CATEGORIES: familles
  })
  return `Tu es le conseiller de style de la maison de prêt-à-porter masculin André Laurent. Un client décrit ce qu'il cherche, et nous en avons extrait des critères. Réponds en français, uniquement via le JSON demandé.

DEMANDE DU CLIENT
« ${demande || '(vide)'} »

CRITÈRES RETENUS
${listeCriteres || '- (aucun critère explicite)'}

FAMILLES QUE LA SÉLECTION VA PROPOSER
${familles || '(non déterminées)'}

TÂCHES
${taches}`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!throttle(req, res)) return
  const body = lireBody(req, res)
  if (!body) return

  const gemini = getGemini()
  if (!gemini) {
    repondre(res, 503, { ok: false, error: 'Reformulation indisponible (clé API absente).' })
    return
  }

  const demande = typeof body.demande === 'string' ? body.demande.slice(0, DEMANDE_MAX) : ''
  const criteres = (Array.isArray(body.criteres) ? body.criteres : [])
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim().slice(0, 120))
    .slice(0, 12)
  // Liste blanche : seules des familles réelles du catalogue.
  const categories = (Array.isArray(body.categories) ? body.categories : [])
    .filter((c): c is Categorie => (ORDRE_CATEGORIES as string[]).includes(c as string))
    .slice(0, 7)

  if (demande.trim().length === 0 && criteres.length === 0) {
    repondre(res, 400, { ok: false, error: 'Rien à reformuler.' })
    return
  }

  try {
    const config = await getPromptConfig()
    const prompt = construirePrompt(config.briefInstructions, demande, criteres, categories)

    const appeler = (model: string) =>
      gemini.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.6,
          responseMimeType: 'application/json',
          responseSchema: briefSchema
        }
      })

    // Meilleur modèle d'abord ; repli sur le GA connu si indisponible (404…).
    let modeleUtilise = ANALYZE_MODEL
    let reponse
    try {
      reponse = await appeler(ANALYZE_MODEL)
    } catch (err) {
      if (ANALYZE_MODEL_FALLBACK && ANALYZE_MODEL_FALLBACK !== ANALYZE_MODEL) {
        const raison = err instanceof Error ? err.message : 'inconnue'
        console.warn(
          `Brief : ${ANALYZE_MODEL} indisponible (${raison}) — repli sur ${ANALYZE_MODEL_FALLBACK}.`
        )
        modeleUtilise = ANALYZE_MODEL_FALLBACK
        reponse = await appeler(ANALYZE_MODEL_FALLBACK)
      } else {
        throw err
      }
    }

    const brut: unknown = JSON.parse(reponse.text ?? 'null')
    const propre = sanitizeBrief(brut)
    if (!propre) {
      repondre(res, 502, { ok: false, error: 'Réponse de reformulation inexploitable.' })
      return
    }
    console.log(`Brief via ${modeleUtilise} — ${criteres.length} critères.`)
    repondre(res, 200, { ok: true, result: propre })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    repondre(res, 502, { ok: false, error: `Reformulation impossible : ${msg}` })
  }
}
