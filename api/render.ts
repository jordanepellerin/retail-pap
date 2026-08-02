// POST /api/render — essayage virtuel par Nano Banana Pro.
// Le modèle reçoit N images : (1) la photo ORIGINALE du visiteur, à conserver
// telle quelle, (2..n) les pièces à lui faire porter. Le prompt formule la
// tâche comme une ÉDITION stricte de la photo du client (surtout pas la
// génération d'une nouvelle personne) : seuls les vêtements dont l'équivalent
// est fourni sont remplacés ; visage, morphologie, pose et décor ne bougent pas.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { lireBody, repondre, throttle } from './_lib/validate.js'
import { applyTemplate, getPromptConfig } from './_lib/promptStore.js'
import { creerProviderGemini } from './_lib/renderProviders/gemini.js'
import { RENDER_MODEL } from './_lib/gemini.js'
import {
  isImageDataUrl,
  sanitizeRenderArticle,
  RENDER_ARTICLES_MAX,
  type RenderArticle
} from '../src/types/ai.js'
import type { Slot } from '../src/types/index.js'
import type { PromptConfig } from '../src/types/admin.js'

/**
 * Ce que chaque emplacement remplace, formulé pour le modèle. C'est la clé du
 * garde-fou : sans cette correspondance explicite, le modèle rhabille la
 * personne de la tête aux pieds au lieu de ne changer que ce qui est fourni.
 */
const CIBLE_PAR_SLOT: Record<Slot, string> = {
  'torse-exterieur': 'son vêtement extérieur du haut (veste, blazer)',
  'torse-interieur': 'son haut porté à même le buste (chemise, pull, polo)',
  jambes: 'son pantalon',
  pieds: 'ses chaussures',
  cou: 'sa cravate ou son nœud papillon',
  taille: 'sa ceinture',
  poche: 'la pochette de sa poche poitrine',
  poignet: 'sa montre'
}

/** Une ligne par pièce : « image 2 : … — remplace … ». */
function ligneImage(article: RenderArticle, index: number): string {
  const cibles = article.slots.map((s) => CIBLE_PAR_SLOT[s]).join(' ET ')
  return `- image ${index + 2} : ${article.description}. Elle remplace ${cibles}.`
}

/**
 * Prompt d'ÉDITION. Le cadre (rôle des images, préservation stricte de la
 * personne et du décor, correspondance pièce ↔ emplacement, interdiction de
 * toucher au reste) est verrouillé ici ; les consignes de réalisme textile
 * viennent du store (éditables depuis /admin).
 */
function construirePromptRendu(
  config: PromptConfig,
  articles: RenderArticle[],
  notes: string
): string {
  const lignes = articles.map(ligneImage).join('\n')
  const slotsFournis = new Set(articles.flatMap((a) => a.slots))
  const nonFournis = (Object.keys(CIBLE_PAR_SLOT) as Slot[])
    .filter((s) => !slotsFournis.has(s))
    .map((s) => CIBLE_PAR_SLOT[s])
  const phraseConservation =
    nonFournis.length > 0
      ? `Ne touche PAS à ${nonFournis.join(', ')} : aucune pièce de remplacement n'est fournie pour ces éléments, ils doivent rester exactement tels qu'ils sont sur la photo d'origine.`
      : ''

  const consignes = applyTemplate(config.renderInstructions, {
    NOTES: notes || 'la lumière naturelle de la photo',
    PIECES: articles.map((a) => a.description).join(' ; ')
  })

  return `Tu ÉDITES la photo d'une personne réelle — tu ne crées surtout PAS une nouvelle personne, ni une nouvelle scène.
PREMIÈRE IMAGE : la photo du client. Son visage, sa coiffure, sa carnation, sa morphologie, sa posture, ses mains, le décor, le cadrage et l'éclairage doivent rester STRICTEMENT identiques.
IMAGES SUIVANTES : les pièces à lui faire porter.
${lignes}

Ta SEULE modification autorisée : remplacer, de façon PHOTORÉALISTE, les vêtements que porte la personne par ceux des images suivantes. Chaque pièce remplace UNIQUEMENT l'élément indiqué ci-dessus. ${phraseConservation}

${consignes}

FIDÉLITÉ PRODUIT : reproduis chaque pièce exactement telle qu'elle est sur son image de référence — même couleur, même matière, même motif, mêmes détails (boutons, revers, col, poches, coutures). N'invente aucun logo, aucun imprimé, aucun texte.
IDENTITÉ : ne modifie ni le visage, ni la carnation, ni la coiffure, ni la silhouette, ni l'âge de la personne. Le résultat doit être immédiatement reconnaissable comme la même personne.
Le résultat DOIT être la photo de la première image, strictement identique partout ailleurs que sur les vêtements remplacés. Ne recadre pas, ne change pas le fond, n'ajoute ni texte ni filigrane.`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!throttle(req, res)) return
  const body = lireBody(req, res)
  if (!body) return

  const photo = isImageDataUrl(body.photo) ? body.photo : null
  const articles = (Array.isArray(body.articles) ? body.articles : [])
    .map(sanitizeRenderArticle)
    .filter((a): a is RenderArticle => a !== null)
    .slice(0, RENDER_ARTICLES_MAX)
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 300) : ''

  if (!photo || articles.length === 0) {
    repondre(res, 400, { ok: false, error: "Requête d'essayage incomplète." })
    return
  }

  const config = await getPromptConfig()
  const provider = creerProviderGemini()
  if (!provider) {
    repondre(res, 503, { ok: false, error: 'Essayage IA indisponible (clé API absente).' })
    return
  }
  console.log(
    `Essayage via Nano Banana Pro (modèle ${RENDER_MODEL}) — ${articles.length} pièce(s), ` +
      `emplacements=[${[...new Set(articles.flatMap((a) => a.slots))].join(',')}].`
  )

  const resultat = await provider.render({
    photoDataUrl: photo,
    articleDataUrls: articles.map((a) => a.image),
    promptText: construirePromptRendu(config, articles, notes)
  })
  if (resultat.ok) {
    repondre(res, 200, { ok: true, image: resultat.imageDataUrl })
  } else {
    repondre(res, 502, { ok: false, error: resultat.error })
  }
}
