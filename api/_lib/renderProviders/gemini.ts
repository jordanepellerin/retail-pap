// Moteur Nano Banana Pro (Gemini 3 Pro Image) — reçoit DEUX images (1. l'œuvre
// seule, 2. la photo de l'intérieur) + un prompt de placement, et intègre
// lui-même l'œuvre dans la pièce (perspective, échelle, lumière, ombres).
// C'est la méthode validée en AI Studio : rendu photoréaliste en ~20 s.

import { getGemini, dataUrlEnPart, RENDER_MODEL } from '../gemini.js'
import type { RenderProvider, RenderProviderInput, RenderProviderResult } from './types.js'

export function creerProviderGemini(): RenderProvider | null {
  const gemini = getGemini()
  if (!gemini) return null
  return {
    async render(input: RenderProviderInput): Promise<RenderProviderResult> {
      try {
        const reponse = await gemini.models.generateContent({
          model: RENDER_MODEL,
          contents: [
            {
              role: 'user',
              // Ordre = édition : (1) la photo de la pièce À CONSERVER, (2) l'œuvre
              // à y ajouter. La photo en premier ancre le modèle sur la scène
              // réelle au lieu d'en générer une nouvelle.
              parts: [
                dataUrlEnPart(input.photoDataUrl),
                dataUrlEnPart(input.artworkDataUrl),
                { text: input.promptText }
              ]
            }
          ]
        })
        const parts = reponse.candidates?.[0]?.content?.parts ?? []
        for (const part of parts) {
          const inline = part.inlineData
          if (inline?.data) {
            const mime = inline.mimeType ?? 'image/png'
            return { ok: true, imageDataUrl: `data:${mime};base64,${inline.data}` }
          }
        }
        return { ok: false, error: "Le modèle n'a pas renvoyé d'image." }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur inconnue'
        return { ok: false, error: `Rendu impossible : ${msg}` }
      }
    }
  }
}
