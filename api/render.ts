// POST /api/render — intégration de l'œuvre dans la photo par Nano Banana Pro.
// Le modèle reçoit DEUX images : (1) la photo ORIGINALE de la pièce, à CONSERVER
// telle quelle, (2) l'œuvre seule à y ajouter. Le prompt formule la tâche comme
// une ÉDITION stricte de la photo du client (surtout pas la génération d'une
// nouvelle pièce) + les repères de placement (où, largeur du mur, dimensions).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { lireBody, repondre, throttle } from './_lib/validate.js'
import { applyTemplate, getPromptConfig } from './_lib/promptStore.js'
import { creerProviderGemini } from './_lib/renderProviders/gemini.js'
import { RENDER_MODEL } from './_lib/gemini.js'
import { isImageDataUrl } from '../src/types/ai.js'
import type { PromptConfig } from '../src/types/admin.js'

type Kind = 'sculpture' | 'peinture'

function lireNombre(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** « le tableau » / « la sculpture » selon le type. */
function nomOeuvre(kind: Kind): string {
  return kind === 'peinture' ? 'le tableau' : 'la sculpture'
}

/** Phrase de dimensions réelles, ou chaîne vide si aucune dimension connue. */
function phraseDimensions(kind: Kind, hCm: number | null, lCm: number | null): string {
  const nom = nomOeuvre(kind)
  const Nom = `${nom.charAt(0).toUpperCase()}${nom.slice(1)}`
  const h = hCm ? Math.round(hCm) : null
  const l = lCm ? Math.round(lCm) : null
  if (h && l) return `${Nom} mesure ${h} cm de haut par ${l} cm de large.`
  if (h) return `${Nom} mesure ${h} cm de haut.`
  if (l) return `${Nom} mesure ${l} cm de large.`
  return ''
}

/**
 * Prompt d'ÉDITION : la tâche n'est pas de générer une belle scène, mais de
 * reprendre la photo du client (image 1) à l'identique et d'y ajouter l'œuvre
 * (image 2). Le cadre (rôle des 2 images, préservation stricte du décor,
 * emplacement, largeur du mur, dimensions) est verrouillé ; les consignes de
 * réalisme du milieu viennent du store (éditables depuis /admin).
 */
function construirePromptRendu(
  config: PromptConfig,
  kind: Kind,
  placement: string,
  planLargeurCm: number | null,
  hauteurCm: number | null,
  largeurCm: number | null,
  cibleHauteurPct: number | null,
  cibleLargeurPct: number | null,
  notes: string
): string {
  const nom = nomOeuvre(kind)
  const commeSi =
    kind === 'peinture'
      ? "comme s'il était réellement accroché au mur"
      : "comme si elle était réellement posée dans la pièce"
  const phraseEmplacement = placement
    ? `Emplacement voulu : « ${placement} ».`
    : `Choisis l'emplacement le plus approprié et dégagé de cette pièce.`
  const phraseMur = planLargeurCm ? `Le support de pose mesure ${Math.round(planLargeurCm)} cm de large.` : ''
  const phraseDims = phraseDimensions(kind, hauteurCm, largeurCm)
  // Contrainte chiffrée : taille exacte calculée par le code (échelle réelle).
  // C'est le repère le plus fiable — prioritaire sur l'estimation visuelle.
  const phraseCible = cibleHauteurPct
    ? `CONTRAINTE DE TAILLE EXACTE (prioritaire) : dans l'image finale, ${nom} doit occuper très précisément environ ${Math.round(cibleHauteurPct)} % de la hauteur totale de l'image${cibleLargeurPct ? ` et ${Math.round(cibleLargeurPct)} % de sa largeur` : ''}. Cette taille correspond à ses dimensions réelles : respecte-la, ne l'agrandis pas.`
    : ''
  // Repères d'échelle : objets de taille standard toujours présents dans un
  // intérieur, pour caler la taille réelle de l'œuvre au lieu de l'estimer « à l'œil ».
  const reperes =
    'prise électrique (~25 cm du sol), assise de chaise (~45 cm), plan de travail (~90 cm), poignée de porte (~105 cm), interrupteur (~110 cm du sol), haut de porte (~200 cm)'
  let phraseEchelle: string
  if (kind === 'sculpture' && hauteurCm) {
    // Ancrage concret et vérifiable : le SOMMET de l'œuvre posée au sol est à
    // ~hauteurCm du sol. Bien plus fiable qu'un « respecte l'échelle » abstrait.
    phraseEchelle = `ÉCHELLE — RÈGLE PRIORITAIRE : l'œuvre mesure ${Math.round(hauteurCm)} cm de haut. Posée au sol, son point le plus haut doit se situer à environ ${Math.round(hauteurCm)} cm du sol. Sers-toi des repères visibles pour viser juste : ${reperes}. Ne la fais SURTOUT PAS plus grande — à cette taille réelle, elle ne domine pas la pièce et n'atteint pas le plafond.`
  } else if (hauteurCm || largeurCm) {
    phraseEchelle = `ÉCHELLE — RÈGLE PRIORITAIRE : respecte les dimensions réelles indiquées en te calant sur les objets de taille standard visibles — ${reperes} — pour que l'œuvre apparaisse à sa vraie taille, ni plus grande ni plus petite.`
  } else {
    phraseEchelle = `Pour la taille, appuie-toi sur les objets de taille standard visibles — ${reperes} — afin d'obtenir une échelle réaliste et crédible.`
  }
  const consignes = applyTemplate(config.renderInstructions, {
    KIND: kind,
    NOTES: notes || 'lumière naturelle de la pièce'
  })
  return `Tu ÉDITES une photo d'intérieur existante — tu ne crées surtout PAS une nouvelle pièce.
PREMIÈRE IMAGE : la photo de la pièce du client. Conserve-la EXACTEMENT telle quelle (mêmes murs, sol, meubles, fenêtres, objets, cadrage, couleurs et éclairage).
DEUXIÈME IMAGE : ${nom} (${kind}) à ajouter dans cette pièce.

Ta SEULE modification autorisée : ajouter ${nom} dans la pièce de la première image, de façon PHOTORÉALISTE, ${commeSi}. ${phraseEmplacement}
${[[phraseMur, phraseDims].filter(Boolean).join(' '), phraseCible, phraseEchelle].filter(Boolean).join('\n')}

${consignes}

Garde l'œuvre ENTIÈRE et visible dans le cadre, socle et base compris — ne la coupe pas, ne la laisse pas dépasser du bas ou des bords de l'image. Le résultat DOIT être la photo de la première image, strictement identique partout ailleurs que sur l'œuvre ajoutée. Ne recadre pas la photo, ne remplace pas le décor, n'invente aucun meuble, n'ajoute ni texte ni signature.`
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!throttle(req, res)) return
  const body = lireBody(req, res)
  if (!body) return

  const photo = isImageDataUrl(body.photo) ? body.photo : null
  const artwork = isImageDataUrl(body.artwork) ? body.artwork : null
  const kind: Kind = body.kind === 'peinture' ? 'peinture' : 'sculpture'
  const placement = typeof body.placement === 'string' ? body.placement.slice(0, 300) : ''
  const planLargeurCm = lireNombre(body.planLargeurCm)
  const hauteurCm = lireNombre(body.hauteurCm)
  const largeurCm = lireNombre(body.largeurCm)
  const cibleHauteurPct = lireNombre(body.cibleHauteurPct)
  const cibleLargeurPct = lireNombre(body.cibleLargeurPct)
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 200) : ''
  if (!photo || !artwork) {
    repondre(res, 400, { ok: false, error: 'Requête de rendu incomplète.' })
    return
  }

  const config = await getPromptConfig()
  const provider = creerProviderGemini()
  if (!provider) {
    repondre(res, 503, { ok: false, error: 'Rendu IA indisponible (clé API absente).' })
    return
  }
  console.log(
    `Rendu via Nano Banana Pro (modèle ${RENDER_MODEL}) — kind=${kind} planLargeurCm=${planLargeurCm ?? '∅'} ` +
      `dims=${hauteurCm ?? '∅'}×${largeurCm ?? '∅'}cm cible=${cibleHauteurPct ? `${Math.round(cibleHauteurPct)}%H` : '∅'}.`
  )

  const resultat = await provider.render({
    photoDataUrl: photo,
    artworkDataUrl: artwork,
    promptText: construirePromptRendu(
      config,
      kind,
      placement,
      planLargeurCm,
      hauteurCm,
      largeurCm,
      cibleHauteurPct,
      cibleLargeurPct,
      notes
    )
  })
  if (resultat.ok) {
    repondre(res, 200, { ok: true, image: resultat.imageDataUrl })
  } else {
    repondre(res, 502, { ok: false, error: resultat.error })
  }
}
