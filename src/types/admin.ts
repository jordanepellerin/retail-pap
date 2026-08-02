// Types du backend d'administration des prompts (page /admin + api/admin/prompts).
// Seul le TEXTE d'instructions est éditable — le schéma JSON de l'analyse et le
// câblage 2-images du rendu (Nano Banana Pro) restent verrouillés dans le code.

export interface PromptConfig {
  /**
   * Corps de la section « TÂCHES » du prompt d'analyse.
   * Placeholders : {{TYPE}}, {{RECHERCHE}}, {{DESCRIPTION}}, {{ARTISTES}},
   * {{VOCABULAIRE}}, {{AVEC_PHOTO}}.
   */
  analyzeInstructions: string
  /**
   * Consignes de placement/réalisme du rendu (échelle, perspective, lumière,
   * ombres, fidélité). Placeholders : {{KIND}}, {{NOTES}}.
   */
  renderInstructions: string
  /**
   * Corps de la section « TÂCHES » du prompt de justification (présentation des
   * artistes retenus). Placeholders : {{TYPE}}, {{RECHERCHE}}, {{DESCRIPTION}},
   * {{ARTISTES}}.
   */
  justifyInstructions: string
}

export const ANALYZE_INSTRUCTIONS_MAX = 6000
export const RENDER_INSTRUCTIONS_MAX = 3000
export const JUSTIFY_INSTRUCTIONS_MAX = 4000

export interface AdminPromptsGetResponse {
  ok: true
  config: PromptConfig
  defaults: PromptConfig
}

export interface AdminPromptsPostRequest {
  analyzeInstructions: string
  renderInstructions: string
  justifyInstructions: string
}

export type AdminPromptsPostResponse = { ok: true; config: PromptConfig } | { ok: false; error: string }
