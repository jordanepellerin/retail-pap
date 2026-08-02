// Moteur Nano Banana Pro (Gemini 3 Pro Image) — reçoit la photo du visiteur
// PUIS un visuel par pièce de la tenue, et remplace lui-même les vêtements
// correspondants (tombé, plis, lumière, ombres) en préservant la personne.

import { getGemini, dataUrlEnPart, RENDER_MODELS, avecMeilleurModele } from '../gemini.js'
import type { RenderProvider, RenderProviderInput, RenderProviderResult } from './types.js'

export function creerProviderGemini(): RenderProvider | null {
  const gemini = getGemini()
  if (!gemini) return null
  return {
    async render(input: RenderProviderInput): Promise<RenderProviderResult> {
      try {
        // Meilleur modèle image ouvert sur la clé (Nano Banana Pro en tête) ;
        // repli automatique sur le suivant s'il est fermé, saturé ou surchargé.
        const { resultat: reponse, modele } = await avecMeilleurModele(
          RENDER_MODELS,
          'Essayage',
          (model) =>
            gemini.models.generateContent({
              model,
              contents: [
                {
                  role: 'user',
                  // Ordre = édition : (1) la photo du client À CONSERVER, (2..n)
                  // les pièces à lui faire porter. La photo en premier ancre le
                  // modèle sur la personne réelle au lieu d'en générer une autre.
                  parts: [
                    dataUrlEnPart(input.photoDataUrl),
                    ...input.articleDataUrls.map(dataUrlEnPart),
                    { text: input.promptText }
                  ]
                }
              ]
            })
        )
        console.log(`Essayage généré via ${modele}.`)
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
        return { ok: false, error: `Essayage impossible : ${msg}` }
      }
    }
  }
}
