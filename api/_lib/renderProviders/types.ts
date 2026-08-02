// Abstraction des moteurs de rendu : le handler /api/render compose le prompt
// et valide les entrées ; le provider ne fait que générer l'essayage.

export interface RenderProviderInput {
  /** Photo ORIGINALE du visiteur — le modèle l'ÉDITE, il ne la recrée pas. */
  photoDataUrl: string
  /** Visuels produits, dans l'ordre annoncé par le prompt (références de fidélité). */
  articleDataUrls: string[]
  /** Prompt complet (cadre verrouillé + consignes de réalisme éditables). */
  promptText: string
}

export type RenderProviderResult =
  | { ok: true; imageDataUrl: string }
  | { ok: false; error: string }

export interface RenderProvider {
  render(input: RenderProviderInput): Promise<RenderProviderResult>
}
