// Store des prompts éditables — lecture Vercel Edge Config (sub-ms, sur chaque
// appel analyze/brief/render), écriture via l'API REST Vercel (réglages admin).
// Dégradation gracieuse : store vide/injoignable → valeurs par défaut ci-dessous.

import { get } from '@vercel/edge-config'
import {
  ANALYZE_INSTRUCTIONS_MAX,
  RENDER_INSTRUCTIONS_MAX,
  BRIEF_INSTRUCTIONS_MAX,
  type PromptConfig
} from '../../src/types/admin.js'

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  analyzeInstructions: `Extrais de la demande du client, et UNIQUEMENT ce qu'il exprime réellement :
1. categories : les familles de produit visées, parmi {{CATEGORIES}}. « Un costume » → costume ; « une tenue complète pour un mariage » → costume, chemise, chaussures, accessoire. Liste vide si rien de net — ne devine pas.
2. occasions : parmi {{OCCASIONS}}. Distingue bien « je me marie » (mariage-marie) de « je suis invité à un mariage » (mariage-invite). Un entretien d'embauche ou une réunion → bureau.
3. matieres : uniquement des termes de cette liste — {{MATIERES}}. « Quelque chose de léger pour l'été » → lin. « Chaud » → laine, flanelle.
4. couleurs : uniquement des termes de cette liste — {{COULEURS}}. « Navy » → bleu, marine. « Sombre » → noir ou marine selon le contexte, pas les deux.
5. budgetMax : le plafond en euros si le client en donne un (« autour de 800 » → 800, « moins de 500 » → 500, « entre 400 et 700 » → 700). null sinon. Ne confonds pas avec une taille ou une pointure.
6. coupe : slim (ajusté, cintré), tailored, regular (droit, ample, confortable), ou null.
7. motsCles : mots du vocabulaire {{MOTS_CLES}} qui décrivent l'ambiance recherchée (« été », « hiver », « original », « classique »…). Maximum 6.
Renseigne confiance entre 0 et 1 : basse si la demande est vague.`,

  renderInstructions: `- TOMBÉ : le vêtement épouse la morphologie réelle de la personne — largeur d'épaules, tour de poitrine, longueur de bras et de jambes. Ne modifie ni sa carrure, ni sa taille, ni sa posture pour faire « mieux tomber » le vêtement.
- MATIÈRE : rends le grain du tissu tel qu'il est sur l'image de référence — froissé du lin, duvet de la flanelle, brillance du satin, côtes du velours, tissage du tweed.
- PLIS : ajoute les plis naturels aux points d'articulation (coudes, aine, genoux) et le léger cassé du pantalon sur la chaussure. Un vêtement parfaitement lisse n'est pas photoréaliste.
- LUMIÈRE : les vêtements reçoivent exactement l'éclairage de la photo d'origine ({{NOTES}}) — même direction, même température, même intensité.
- OMBRES : ombres portées cohérentes sur le corps et au sol, dans la continuité de celles déjà présentes dans la photo.
- SUPERPOSITION : respecte l'ordre d'habillage réel — chemise sous la veste, col et poignets de chemise visibles, cravate sur la chemise et sous la veste, pochette dans la poche poitrine, ceinture à la taille du pantalon.
- Pièces à faire porter, dans l'ordre : {{PIECES}}.`,

  briefInstructions: `Le client a formulé sa demande ci-dessus, et nous en avons retenu une liste de critères.
1. reformulation : reformule son besoin en UNE phrase, adressée à lui, qui reprend fidèlement les critères retenus (ex. « Vous cherchez un costume en lin clair pour un mariage en extérieur, dans une limite de 700 €. »). N'ajoute aucun critère qui ne figure pas dans la liste. Si la demande est vague, reste général plutôt que d'inventer.
2. conseil : UNE phrase de parti pris de conseiller, en lien direct avec ce qu'il a demandé — une matière qui convient particulièrement, un piège à éviter, une association qui fonctionne (ex. « Pour un mariage en juin, le lin respire mieux que la laine — et son froissé fait partie de son allure. »). Reste sobre et honnête : pas de superlatifs, pas de promesse commerciale.
Écris dans un français soigné, chaleureux et sans jargon. Vouvoie le client.`
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
      briefInstructions: texteValide(brut.briefInstructions, BRIEF_INSTRUCTIONS_MAX)
        ? brut.briefInstructions
        : DEFAULT_PROMPT_CONFIG.briefInstructions
    }
  } catch (e) {
    console.warn('Edge Config injoignable — prompts par défaut utilisés.', e)
    return { ...DEFAULT_PROMPT_CONFIG }
  }
}

/**
 * ID du store : `EDGE_CONFIG_ID` s'il est déclaré, sinon extrait de la chaîne de
 * connexion `EDGE_CONFIG` (auto-injectée en connectant le store au projet) —
 * une variable de moins à saisir à la main.
 */
function edgeConfigId(): string | null {
  const explicite = process.env.EDGE_CONFIG_ID?.trim()
  if (explicite) return explicite
  return /\/(ecfg_[A-Za-z0-9]+)/.exec(process.env.EDGE_CONFIG ?? '')?.[1] ?? null
}

/** Écrit la config via l'API REST Vercel (nécessite le store + VERCEL_API_TOKEN). */
export async function writePromptConfig(
  config: PromptConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = edgeConfigId()
  const token = process.env.VERCEL_API_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!id || !token) {
    const manquantes = [
      id ? null : 'EDGE_CONFIG_ID (ou la connexion du store, qui injecte EDGE_CONFIG)',
      token ? null : 'VERCEL_API_TOKEN'
    ].filter(Boolean)
    return { ok: false, error: `Variables Vercel manquantes : ${manquantes.join(' et ')}.` }
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
      return {
        ok: false,
        error: `Écriture Edge Config refusée (${res.status}) : ${detail.slice(0, 300)}`
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau Edge Config.' }
  }
}
