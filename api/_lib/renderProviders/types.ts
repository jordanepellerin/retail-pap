// Abstraction des moteurs de rendu : le handler /api/render compose le prompt
// et valide les entrées ; le provider ne fait que générer l'image harmonisée.

export interface RenderProviderInput {
  /** Photo ORIGINALE de l'intérieur (jamais pré-composée) — le modèle y place l'œuvre. */
  photoDataUrl: string
  /** L'œuvre seule à intégrer — référence de fidélité. */
  artworkDataUrl: string
  /** Prompt complet (cadre verrouillé + consignes de placement/réalisme éditables). */
  promptText: string
}

export type RenderProviderResult =
  | { ok: true; imageDataUrl: string }
  | { ok: false; error: string }

export interface RenderProvider {
  render(input: RenderProviderInput): Promise<RenderProviderResult>
}
