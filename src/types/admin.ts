// Types du backend d'administration des prompts (page /admin + api/admin/prompts).
// Seul le TEXTE d'instructions est éditable — le schéma JSON de l'analyse et le
// câblage multi-images du rendu restent verrouillés dans le code.

export interface PromptConfig {
  /**
   * Corps de la section « TÂCHES » du prompt d'analyse d'intention.
   * Placeholders : {{DEMANDE}}, {{CATEGORIES}}, {{OCCASIONS}}, {{MATIERES}},
   * {{COULEURS}}, {{MOTS_CLES}}.
   */
  analyzeInstructions: string
  /**
   * Consignes de réalisme de l'essayage (tombé, matière, plis, lumière, ombres).
   * Placeholders : {{NOTES}}, {{PIECES}}.
   */
  renderInstructions: string
  /**
   * Corps de la section « TÂCHES » du prompt de reformulation.
   * Placeholders : {{DEMANDE}}, {{CRITERES}}, {{CATEGORIES}}.
   */
  briefInstructions: string
}

export const ANALYZE_INSTRUCTIONS_MAX = 6000
export const RENDER_INSTRUCTIONS_MAX = 3000
export const BRIEF_INSTRUCTIONS_MAX = 4000

export interface AdminPromptsGetResponse {
  ok: true
  config: PromptConfig
  defaults: PromptConfig
}

export interface AdminPromptsPostRequest {
  analyzeInstructions: string
  renderInstructions: string
  briefInstructions: string
}

export type AdminPromptsPostResponse =
  | { ok: true; config: PromptConfig }
  | { ok: false; error: string }
