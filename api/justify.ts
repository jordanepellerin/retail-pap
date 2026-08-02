// POST /api/justify — reformule la demande du client et rédige une
// justification par artiste retenu, en UN appel Gemini à sortie JSON.
// Appelé APRÈS le matching (le code a déjà choisi les artistes) : l'IA se
// concentre sur le lien demande ↔ artiste. Sans clé API, renvoie une erreur
// propre → le widget dégrade vers des justifications 100 % code.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Type, type Schema } from '@google/genai'
import { getGemini, ANALYZE_MODEL, ANALYZE_MODEL_FALLBACK } from './_lib/gemini.js'
import { lireBody, repondre, throttle } from './_lib/validate.js'
import { applyTemplate, getPromptConfig } from './_lib/promptStore.js'
import { sanitizeJustify, RECHERCHE_MAX, DESCRIPTION_MAX } from '../src/types/ai.js'
import { ARTISTES, BIO_ARTISTES, CATALOGUE } from '../src/data/catalogue.js'

// Schéma de sortie structuré — miroir de JustifyResult (src/types/ai.ts).
const justifySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reformulation: {
      type: Type.STRING,
      description: 'Reformulation fidèle et élégante de la demande, adressée au client.'
    },
    justifications: {
      type: Type.ARRAY,
      description: 'Une entrée par artiste retenu, dans l\'ordre fourni.',
      items: {
        type: Type.OBJECT,
        properties: {
          artiste: { type: Type.STRING, description: 'Nom exact de l\'artiste fourni.' },
          phrase: {
            type: Type.STRING,
            description: 'Une à deux phrases reliant l\'artiste à la demande du client.'
          }
        },
        required: ['artiste', 'phrase']
      }
    }
  },
  required: ['reformulation', 'justifications']
}

const sansAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Fiche par artiste injectée dans le prompt : univers + quelques œuvres repères. */
function ficheArtiste(artiste: string): string {
  const bio = BIO_ARTISTES[artiste] ?? ''
  const oeuvres = CATALOGUE.filter((o) => o.artiste === artiste)
    .slice(0, 3)
    .map((o) => `« ${o.titre} » (${o.descriptionCourte})`)
    .join(' ; ')
  return `- ${artiste} : ${bio}${oeuvres ? ` Œuvres : ${oeuvres}.` : ''}`
}

/**
 * Le squelette (rôle, écho de la demande, fiches artistes) reste dans le code ;
 * seule la section « TÂCHES » vient du store (éditable depuis /admin).
 */
function construirePrompt(
  instructions: string,
  type: string,
  recherche: string,
  description: string,
  artistes: string[]
): string {
  const fiches = artistes.map(ficheArtiste).join('\n')
  const taches = applyTemplate(instructions, {
    TYPE: type,
    RECHERCHE: recherche,
    DESCRIPTION: description,
    ARTISTES: fiches
  })
  return `Tu es le conseiller d'art des Galeries Bartoux. Un client décrit le projet d'œuvre qu'il souhaite accueillir chez lui, et nous avons présélectionné des artistes de notre catalogue. Réponds en français, uniquement via le JSON demandé.

DEMANDE DU CLIENT
- Type d'œuvre recherché : ${type}
- Description libre : « ${recherche || '(vide)'} »
- Précisions / emplacement : « ${description || '(vide)'} »

ARTISTES RETENUS (dans cet ordre) et leurs univers :
${fiches}

TÂCHES
${taches}`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!throttle(req, res)) return
  const body = lireBody(req, res)
  if (!body) return

  const gemini = getGemini()
  if (!gemini) {
    repondre(res, 503, { ok: false, error: 'Justification indisponible (clé API absente).' })
    return
  }

  const type = body.type === 'peinture' ? 'peinture' : 'sculpture'
  const recherche = typeof body.recherche === 'string' ? body.recherche.slice(0, RECHERCHE_MAX) : ''
  const description =
    typeof body.description === 'string' ? body.description.slice(0, DESCRIPTION_MAX) : ''

  // Liste blanche : on ne garde que des artistes réels du catalogue, dédupliqués.
  const artistesNorm = new Map(ARTISTES.map((x) => [sansAccents(x), x]))
  const artistes = [
    ...new Set(
      (Array.isArray(body.artistes) ? body.artistes : [])
        .filter((x): x is string => typeof x === 'string')
        .map((x) => artistesNorm.get(sansAccents(x)))
        .filter((x): x is string => x !== undefined)
    )
  ].slice(0, 6)

  if (artistes.length === 0) {
    repondre(res, 400, { ok: false, error: 'Aucun artiste valide à justifier.' })
    return
  }

  try {
    const config = await getPromptConfig()
    const prompt = construirePrompt(config.justifyInstructions, type, recherche, description, artistes)

    const appeler = (model: string) =>
      gemini.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.6,
          responseMimeType: 'application/json',
          responseSchema: justifySchema
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
          `Justification : ${ANALYZE_MODEL} indisponible (${raison}) — repli sur ${ANALYZE_MODEL_FALLBACK}.`
        )
        modeleUtilise = ANALYZE_MODEL_FALLBACK
        reponse = await appeler(ANALYZE_MODEL_FALLBACK)
      } else {
        throw err
      }
    }

    const brut: unknown = JSON.parse(reponse.text ?? 'null')
    const propre = sanitizeJustify(brut)
    if (!propre) {
      repondre(res, 502, { ok: false, error: 'Réponse de justification inexploitable.' })
      return
    }
    // Ne garder que des justifications d'artistes réels (liste blanche).
    const resultat = {
      reformulation: propre.reformulation,
      justifications: propre.justifications
        .map((j) => {
          const nom = artistesNorm.get(sansAccents(j.artiste))
          return nom ? { artiste: nom, phrase: j.phrase } : null
        })
        .filter((j): j is { artiste: string; phrase: string } => j !== null)
    }
    console.log(
      `Justification via ${modeleUtilise} — ${resultat.justifications.length}/${artistes.length} artistes.`
    )
    repondre(res, 200, { ok: true, result: resultat })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    repondre(res, 502, { ok: false, error: `Justification impossible : ${msg}` })
  }
}
