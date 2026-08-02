// Store des prompts éditables — lecture Vercel Edge Config (sub-ms, sur chaque
// appel analyze/render), écriture via l'API REST Vercel (rare : réglages admin).
// Dégradation gracieuse : store vide/injoignable → valeurs par défaut ci-dessous,
// identiques aux prompts historiques (comportement inchangé tant que rien n'est édité).

import { get } from '@vercel/edge-config'
import {
  ANALYZE_INSTRUCTIONS_MAX,
  RENDER_INSTRUCTIONS_MAX,
  JUSTIFY_INSTRUCTIONS_MAX,
  type PromptConfig
} from '../../src/types/admin.js'

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  analyzeInstructions: `1. intent : identifie les artistes visés. Un nom explicite prime ; sinon, si la recherche décrit clairement l'univers d'un artiste (ex. « un homme avec une valise qui marche » → Bruno Catalano), renvoie cet artiste. Ne force jamais : liste vide si rien de net. Normalise les envies dans intent.motsCles (vocabulaire autorisé uniquement), mets les descriptions libres dans intent.sujets, les couleurs souhaitées dans intent.couleurs, et tailleSouhaitee si le client l'exprime (« grande pièce » → grande).
2. photo (fournie : {{AVEC_PHOTO}}) : si aucune photo n'est fournie, renvoie photo: null. Sinon, propose jusqu'à 3 zones de placement (rectangles en % de l'image, x/y = coin haut-gauche). La zone 0 DOIT respecter le souhait du client s'il en a exprimé un. Pour une sculpture : surface sol ou meuble dégagée (console, buffet, coin de pièce) ; pour une peinture : pan de mur dégagé, à hauteur de regard. Évite fenêtres, portes et zones encombrées. Pour CHAQUE zone, renseigne aussi "quad" : les 4 coins EXACTS (haut-gauche, haut-droit, bas-droit, bas-gauche, en %) où l'œuvre doit être posée EN PERSPECTIVE sur le plan réel. Observe les lignes de fuite : si le mur s'éloigne vers un côté, ce côté de l'œuvre est plus court et légèrement décalé — le quad n'est PAS un simple rectangle si le mur est vu en angle. Si tu ne peux pas estimer la perspective, mets quad: null.
3. échelle (seulement si photo fournie) : si le client donne la largeur d'un mur/plan (ex. « ce mur fait 110 cm »), fais coïncider zones[0] EXACTEMENT avec ce mur (bord gauche à bord droit du plan) et renseigne planLargeurCm = cette largeur en cm — c'est le repère le plus fiable, le code en déduira l'échelle. Renseigne aussi pxPerCm au plan de placement : PRIORITÉ ABSOLUE aux dimensions données par le client, sinon repères standards (porte ≈ 200–210 cm, assise ≈ 45 cm, plan de travail ≈ 90 cm, interrupteur ≈ 110 cm du sol, carrelage ≈ 60 cm). Indique le repère dans scaleSource. Décris aussi lumiere (direction, chaleur), styleInterieur et couleursDominantes.`,
  renderInstructions: `- ÉCHELLE (crucial) : respecte scrupuleusement les dimensions réelles indiquées et VÉRIFIE-les contre les objets-repères visibles dans la photo — prise électrique (~25 cm du sol), interrupteur (~110 cm du sol), poignée de porte (~105 cm), plinthe, carrelage, mobilier. Une sculpture de 1 m posée au sol arrive juste sous un interrupteur, surtout pas au niveau du haut d'une porte. Si l'œuvre dépasse la largeur de son support, elle peut légèrement déborder.
- PERSPECTIVE : aligne l'œuvre sur les lignes de fuite du mur ou du plan. Si le support est vu en angle, l'œuvre épouse cet angle.
- LUMIÈRE : fais réagir sa surface à l'éclairage réel de la pièce ({{NOTES}}) — mêmes teintes, mêmes zones claires/sombres que son environnement immédiat.
- OMBRES : ajoute une ombre de contact et une ombre portée douces et réalistes, cohérentes avec la direction de la lumière.
- FIDÉLITÉ : reproduis l'œuvre fournie le plus fidèlement possible (mêmes formes, couleurs, composition et cadre) ; ne la redessine pas et ne la recadre pas.
- Si l'œuvre est une {{KIND}} (sculpture) : pose-la sur son support avec une ombre au sol et un léger reflet si le sol est brillant.`,
  justifyInstructions: `Le client a décrit son projet ci-dessus. En te basant UNIQUEMENT sur ce qu'il exprime :
1. reformulation : reformule sa demande en UNE phrase élégante et fidèle, adressée au client (ex. « Vous recherchez un portrait coloré d'environ 1 m sur 1,50 m »). Reste concret, n'invente rien ; si la demande est vague, reste général sans extrapoler.
2. justifications : pour CHAQUE artiste listé (dans le même ordre), rédige UNE à DEUX phrases (40 mots max) expliquant en quoi son univers répond à la demande, en faisant explicitement le lien avec ce que le client a décrit et en nommant l'artiste (ex. « L'homme à la valise que vous évoquez fait directement écho aux Voyageurs de Bruno Catalano »). Appuie-toi sur les univers et œuvres fournis. Sois sincère : si le lien est ténu, reste sobre et honnête plutôt que d'exagérer.
Écris dans un français soigné, chaleureux et sans jargon.`
}

/**
 * Substitue les placeholders {{KEY}} par les valeurs fournies.
 * Les clés inconnues restent en clair (défensif : jamais d'exception).
 */
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (tout, cle: string) =>
    Object.prototype.hasOwnProperty.call(vars, cle) ? vars[cle] : tout
  )
}

function texteValide(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max
}

/**
 * Config effective : Edge Config fusionné champ par champ sur les défauts.
 * Ne lève jamais — un store vide ou injoignable rend simplement les défauts.
 */
export async function getPromptConfig(): Promise<PromptConfig> {
  try {
    const brut = await get<Partial<PromptConfig>>('promptConfig')
    if (!brut || typeof brut !== 'object') return { ...DEFAULT_PROMPT_CONFIG }
    return {
      analyzeInstructions: texteValide(brut.analyzeInstructions, ANALYZE_INSTRUCTIONS_MAX)
        ? brut.analyzeInstructions
        : DEFAULT_PROMPT_CONFIG.analyzeInstructions,
      renderInstructions: texteValide(brut.renderInstructions, RENDER_INSTRUCTIONS_MAX)
        ? brut.renderInstructions
        : DEFAULT_PROMPT_CONFIG.renderInstructions,
      justifyInstructions: texteValide(brut.justifyInstructions, JUSTIFY_INSTRUCTIONS_MAX)
        ? brut.justifyInstructions
        : DEFAULT_PROMPT_CONFIG.justifyInstructions
    }
  } catch (e) {
    console.warn('Edge Config injoignable — prompts par défaut utilisés.', e)
    return { ...DEFAULT_PROMPT_CONFIG }
  }
}

/** Écrit la config via l'API REST Vercel (nécessite EDGE_CONFIG_ID + VERCEL_API_TOKEN). */
export async function writePromptConfig(
  config: PromptConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = process.env.EDGE_CONFIG_ID
  const token = process.env.VERCEL_API_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!id || !token) {
    return { ok: false, error: 'EDGE_CONFIG_ID ou VERCEL_API_TOKEN manquant (variables Vercel).' }
  }
  const url = `https://api.vercel.com/v1/edge-config/${id}/items${teamId ? `?teamId=${teamId}` : ''}`
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key: 'promptConfig', value: config }] })
    })
    if (!res.ok) {
      const detail = await res.text()
      return { ok: false, error: `Écriture Edge Config refusée (${res.status}) : ${detail.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau Edge Config.' }
  }
}
