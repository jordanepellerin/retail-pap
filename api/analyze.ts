// POST /api/analyze — lecture de la demande libre du visiteur et normalisation
// dans le vocabulaire du catalogue, en UN appel à sortie JSON structurée.
// Appelé seulement quand le code n'a pas su lire la demande (cf.
// `besoinAnalyseIA`). Sans clé API, renvoie une erreur propre → le widget
// continue sur la seule intention détectée en code.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Type, type Schema } from '@google/genai'
import { getGemini, ANALYZE_MODELS, avecMeilleurModele } from './_lib/gemini.js'
import { lireBody, repondre, throttle } from './_lib/validate.js'
import { applyTemplate, getPromptConfig } from './_lib/promptStore.js'
import { sanitizeAnalyse, DEMANDE_MAX, type AnalyseResult } from '../src/types/ai.js'
import {
  ORDRE_CATEGORIES,
  VOCABULAIRE_COULEURS,
  VOCABULAIRE_MATIERES,
  VOCABULAIRE_MOTS_CLES
} from '../src/data/catalogue.js'

const OCCASIONS = [
  'mariage-invite',
  'mariage-marie',
  'bureau',
  'soiree',
  'ceremonie',
  'quotidien'
]

// Schéma de sortie structuré — miroir de AnalyseResult (src/types/ai.ts).
const analyseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.OBJECT,
      properties: {
        categories: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: [...ORDRE_CATEGORIES] }
        },
        occasions: { type: Type.ARRAY, items: { type: Type.STRING, enum: OCCASIONS } },
        matieres: { type: Type.ARRAY, items: { type: Type.STRING } },
        couleurs: { type: Type.ARRAY, items: { type: Type.STRING } },
        budgetMax: {
          type: Type.NUMBER,
          nullable: true,
          description: 'Plafond en euros exprimé par le client, null si aucun.'
        },
        coupe: {
          type: Type.STRING,
          enum: ['slim', 'tailored', 'regular'],
          nullable: true
        },
        motsCles: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['categories', 'occasions', 'matieres', 'couleurs', 'budgetMax', 'coupe', 'motsCles']
    },
    confiance: { type: Type.NUMBER }
  },
  required: ['intent', 'confiance']
}

/**
 * Le squelette (rôle, injection des vocabulaires, écho de la demande) reste
 * dans le code — le whitelisting de `filtrerWhitelists` dépend de ces listes
 * exactes. Seule la section « TÂCHES » vient du store (éditable depuis /admin).
 */
function construirePrompt(instructions: string, demande: string): string {
  const taches = applyTemplate(instructions, {
    DEMANDE: demande,
    CATEGORIES: ORDRE_CATEGORIES.join(', '),
    OCCASIONS: OCCASIONS.join(', '),
    MATIERES: VOCABULAIRE_MATIERES.join(', '),
    COULEURS: VOCABULAIRE_COULEURS.join(', '),
    MOTS_CLES: VOCABULAIRE_MOTS_CLES.join(', ')
  })
  return `Tu es le conseiller de style de la maison de prêt-à-porter masculin André Laurent. Tu lis la demande d'un client pour l'orienter dans la collection. Réponds en français, uniquement via le JSON demandé.

VOCABULAIRES AUTORISÉS (n'utilise aucun autre terme)
- categories : ${ORDRE_CATEGORIES.join(', ')}
- occasions : ${OCCASIONS.join(', ')}
- matieres : ${VOCABULAIRE_MATIERES.join(', ')}
- couleurs : ${VOCABULAIRE_COULEURS.join(', ')}
- motsCles : ${VOCABULAIRE_MOTS_CLES.join(', ')}

DEMANDE DU CLIENT
« ${demande || '(vide)'} »

TÂCHES
${taches}`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!throttle(req, res)) return
  const body = lireBody(req, res)
  if (!body) return

  const gemini = getGemini()
  if (!gemini) {
    repondre(res, 503, { ok: false, error: 'Analyse indisponible (clé API absente).' })
    return
  }

  const demande = typeof body.demande === 'string' ? body.demande.slice(0, DEMANDE_MAX) : ''
  if (demande.trim().length === 0) {
    repondre(res, 400, { ok: false, error: 'Demande vide.' })
    return
  }

  try {
    const config = await getPromptConfig()
    const prompt = construirePrompt(config.analyzeInstructions, demande)

    // Meilleur modèle ouvert sur la clé, avec cascade automatique vers le
    // suivant s'il est fermé, saturé ou surchargé.
    const { resultat: reponse, modele: modeleUtilise } = await avecMeilleurModele(
      ANALYZE_MODELS,
      'Analyse',
      (model) =>
        gemini.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: analyseSchema
          }
        })
    )

    const brut: unknown = JSON.parse(reponse.text ?? 'null')
    const propre = sanitizeAnalyse(brut)
    if (!propre) {
      repondre(res, 502, { ok: false, error: "Réponse d'analyse inexploitable." })
      return
    }
    const resultat = filtrerWhitelists(propre)
    console.log(
      `Analyse via ${modeleUtilise} — categories=[${resultat.intent.categories.join(',')}] ` +
        `occasions=[${resultat.intent.occasions.join(',')}] budget=${resultat.intent.budgetMax ?? '∅'}.`
    )
    repondre(res, 200, { ok: true, result: resultat })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    repondre(res, 502, { ok: false, error: `Analyse impossible : ${msg}` })
  }
}

/**
 * Le schéma garantit la forme et les unions fermées ; on garantit ici que les
 * matières, couleurs et mots-clés appartiennent bien au catalogue — sans quoi
 * le scoring comparerait des termes qui n'existent nulle part.
 */
function filtrerWhitelists(a: AnalyseResult): AnalyseResult {
  const sansAccents = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
  const index = (liste: string[]) => new Map(liste.map((x) => [sansAccents(x), x]))
  const matieres = index(VOCABULAIRE_MATIERES)
  const couleurs = index(VOCABULAIRE_COULEURS)
  const motsCles = index(VOCABULAIRE_MOTS_CLES)
  const garder = (valeurs: string[], reference: Map<string, string>) => [
    ...new Set(
      valeurs
        .map((x) => reference.get(sansAccents(x)))
        .filter((x): x is string => x !== undefined)
    )
  ]
  return {
    ...a,
    intent: {
      ...a.intent,
      matieres: garder(a.intent.matieres, matieres),
      couleurs: garder(a.intent.couleurs, couleurs),
      motsCles: garder(a.intent.motsCles, motsCles)
    }
  }
}
