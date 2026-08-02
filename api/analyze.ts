// POST /api/analyze — analyse de la photo de l'espace + normalisation des
// textes libres, en UN appel Gemini Flash à sortie JSON structurée.
// Sans photo, l'appel devient texte-seul (quasi gratuit). Sans clé API,
// renvoie une erreur propre → le widget dégrade vers le comportement mock.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Type, type Schema } from '@google/genai'
import { getGemini, dataUrlEnPart, ANALYZE_MODEL, ANALYZE_MODEL_FALLBACK } from './_lib/gemini.js'
import { lireBody, repondre, throttle } from './_lib/validate.js'
import { applyTemplate, getPromptConfig } from './_lib/promptStore.js'
import {
  sanitizeAnalyse,
  isImageDataUrl,
  RECHERCHE_MAX,
  DESCRIPTION_MAX,
  type AnalyseResult
} from '../src/types/ai.js'
import { ARTISTES, MOTS_CLES_ARTISTES, VOCABULAIRE_MOTS_CLES } from '../src/data/catalogue.js'

// Schéma de sortie structuré — miroir de AnalyseResult (src/types/ai.ts).
const pointSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    x: { type: Type.NUMBER, description: '% de la largeur (0–100)' },
    y: { type: Type.NUMBER, description: '% de la hauteur (0–100)' }
  },
  required: ['x', 'y']
}

const zoneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    x: { type: Type.NUMBER, description: 'Coin haut-gauche, % de la largeur (0–100)' },
    y: { type: Type.NUMBER, description: 'Coin haut-gauche, % de la hauteur (0–100)' },
    w: { type: Type.NUMBER, description: 'Largeur en % (0–100)' },
    h: { type: Type.NUMBER, description: 'Hauteur en % (0–100)' },
    label: { type: Type.STRING, description: 'Libellé court en français' },
    kind: { type: Type.STRING, enum: ['mur', 'sol', 'meuble'] },
    confidence: { type: Type.NUMBER, description: '0–1' },
    quad: {
      type: Type.ARRAY,
      description:
        'Les 4 coins EXACTS où poser l\'œuvre en perspective, dans l\'ordre haut-gauche, haut-droit, bas-droit, bas-gauche. Suit les lignes de fuite du mur : si le mur fuit vers la droite, le bord droit de l\'œuvre est plus court/rapproché que le gauche.',
      items: pointSchema,
      minItems: '4',
      maxItems: '4',
      nullable: true
    }
  },
  required: ['x', 'y', 'w', 'h', 'label', 'kind', 'confidence', 'quad']
}

const analyseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    photo: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        zones: { type: Type.ARRAY, items: zoneSchema, maxItems: '3' },
        pxPerCm: {
          type: Type.NUMBER,
          nullable: true,
          description: 'Pixels de la photo par centimètre réel, au plan de placement'
        },
        planLargeurCm: {
          type: Type.NUMBER,
          nullable: true,
          description:
            'Largeur réelle en cm du mur/plan de zones[0] (ex. « ce mur fait 110 cm »). zones[0].w doit couvrir exactement ce mur.'
        },
        scaleSource: { type: Type.STRING, nullable: true },
        lumiere: { type: Type.STRING },
        styleInterieur: { type: Type.ARRAY, items: { type: Type.STRING } },
        couleursDominantes: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: [
        'zones',
        'pxPerCm',
        'planLargeurCm',
        'scaleSource',
        'lumiere',
        'styleInterieur',
        'couleursDominantes'
      ]
    },
    intent: {
      type: Type.OBJECT,
      properties: {
        artistes: { type: Type.ARRAY, items: { type: Type.STRING } },
        motsCles: { type: Type.ARRAY, items: { type: Type.STRING } },
        sujets: { type: Type.ARRAY, items: { type: Type.STRING } },
        tailleSouhaitee: { type: Type.STRING, enum: ['petite', 'moyenne', 'grande'], nullable: true },
        couleurs: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['artistes', 'motsCles', 'sujets', 'tailleSouhaitee', 'couleurs']
    },
    confiance: { type: Type.NUMBER }
  },
  required: ['photo', 'intent', 'confiance']
}

/**
 * Le squelette (rôle, injection du catalogue, écho de la demande) reste dans le
 * code — le whitelisting de filtrerWhitelists() dépend de ces listes exactes.
 * Seule la section « TÂCHES » vient du store (éditable depuis /admin).
 */
function construirePrompt(
  instructions: string,
  type: string,
  recherche: string,
  description: string,
  avecPhoto: boolean
): string {
  const fiches = ARTISTES.map((a) => `- ${a} : ${(MOTS_CLES_ARTISTES[a] ?? []).join(', ')}`).join('\n')
  const taches = applyTemplate(instructions, {
    TYPE: type,
    RECHERCHE: recherche,
    DESCRIPTION: description,
    ARTISTES: fiches,
    VOCABULAIRE: VOCABULAIRE_MOTS_CLES.join(', '),
    AVEC_PHOTO: avecPhoto ? 'oui' : 'non'
  })
  return `Tu es le conseiller d'art des Galeries Bartoux. Tu analyses la demande d'un client pour l'aider à choisir et placer une œuvre chez lui. Réponds en français, uniquement via le JSON demandé.

ARTISTES DU CATALOGUE (seuls noms autorisés dans intent.artistes) et leurs univers :
${fiches}

VOCABULAIRE (seuls termes autorisés dans intent.motsCles) : ${VOCABULAIRE_MOTS_CLES.join(', ')}

DEMANDE DU CLIENT
- Type d'œuvre recherché : ${type}
- Recherche libre : « ${recherche || '(vide)'} »
- Emplacement souhaité / repères de dimensions : « ${description || '(vide)'} »

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

  const type = body.type === 'peinture' ? 'peinture' : 'sculpture'
  const recherche = typeof body.recherche === 'string' ? body.recherche.slice(0, RECHERCHE_MAX) : ''
  const description =
    typeof body.description === 'string' ? body.description.slice(0, DESCRIPTION_MAX) : ''
  const photo = isImageDataUrl(body.photo) ? body.photo : null

  try {
    const config = await getPromptConfig()
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = []
    if (photo) parts.push(dataUrlEnPart(photo))
    parts.push({
      text: construirePrompt(config.analyzeInstructions, type, recherche, description, photo !== null)
    })

    const appeler = (model: string) =>
      gemini.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: analyseSchema
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
        console.warn(`Analyse : ${ANALYZE_MODEL} indisponible (${raison}) — repli sur ${ANALYZE_MODEL_FALLBACK}.`)
        modeleUtilise = ANALYZE_MODEL_FALLBACK
        reponse = await appeler(ANALYZE_MODEL_FALLBACK)
      } else {
        throw err
      }
    }

    const brut: unknown = JSON.parse(reponse.text ?? 'null')
    const propre = sanitizeAnalyse(brut)
    if (!propre) {
      repondre(res, 502, { ok: false, error: "Réponse d'analyse inexploitable." })
      return
    }
    const resultat = filtrerWhitelists(propre)
    console.log(
      `Analyse via ${modeleUtilise} — photo=${photo ? 'oui' : 'non'} ` +
        `pxPerCm=${resultat.photo?.pxPerCm ?? '∅'} planLargeurCm=${resultat.photo?.planLargeurCm ?? '∅'} ` +
        `zones=${resultat.photo?.zones.length ?? 0} scaleSource="${resultat.photo?.scaleSource ?? ''}".`
    )
    repondre(res, 200, { ok: true, result: resultat })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    repondre(res, 502, { ok: false, error: `Analyse impossible : ${msg}` })
  }
}

/** Le schéma garantit la forme ; on garantit ici les listes blanches du catalogue. */
function filtrerWhitelists(a: AnalyseResult): AnalyseResult {
  const sansAccents = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const artistesNorm = new Map(ARTISTES.map((x) => [sansAccents(x), x]))
  const vocabNorm = new Map(VOCABULAIRE_MOTS_CLES.map((x) => [sansAccents(x), x]))
  return {
    ...a,
    intent: {
      ...a.intent,
      artistes: [
        ...new Set(
          a.intent.artistes
            .map((x) => artistesNorm.get(sansAccents(x)))
            .filter((x): x is string => x !== undefined)
        )
      ],
      motsCles: [
        ...new Set(
          a.intent.motsCles
            .map((x) => vocabNorm.get(sansAccents(x)))
            .filter((x): x is string => x !== undefined)
        )
      ]
    }
  }
}
