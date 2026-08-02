// Client Gemini partagé par les fonctions serverless. La clé n'existe que côté
// serveur (env Vercel / .env.local) — seul le dossier api/ importe @google/genai,
// elle ne peut donc pas fuiter dans le bundle client.

import { GoogleGenAI } from '@google/genai'

// Modèles par défaut : les plus capables disponibles publiquement (priorité
// qualité, pas coût). L'analyse (raisonnement spatial : échelle, perspective,
// zones) tourne sur le flagship Gemini 3.1 Pro ; le rendu sur Nano Banana Pro
// (Gemini 3 Pro Image), qui place et intègre l'œuvre à partir de deux images
// (œuvre + pièce) + prompt. Tout est surchargeable par variables d'env
// (ex. ANALYZE_MODEL=gemini-3.5-pro-preview dès qu'il sera public sur l'API).

/** Analyse photo + intention : flagship Gemini 3.1 Pro (vision + raisonnement + JSON). */
export const ANALYZE_MODEL = process.env.ANALYZE_MODEL ?? 'gemini-3.1-pro-preview'
/**
 * Repli si ANALYZE_MODEL est indisponible (modèle preview non ouvert sur la clé,
 * 404…) : un modèle GA connu pour fonctionner, pour ne jamais casser l'analyse.
 */
export const ANALYZE_MODEL_FALLBACK = process.env.ANALYZE_MODEL_FALLBACK ?? 'gemini-2.5-flash'
/** Intégration de l'œuvre dans la photo : Nano Banana Pro (Gemini 3 Pro Image). */
export const RENDER_MODEL = process.env.RENDER_MODEL ?? 'gemini-3-pro-image'

let client: GoogleGenAI | null = null

/** Renvoie le client Gemini, ou null si la clé n'est pas configurée (mode démo). */
export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return null
  client ??= new GoogleGenAI({ apiKey })
  return client
}

/** Convertit une dataURL d'image en part `inlineData` pour generateContent. */
export function dataUrlEnPart(dataUrl: string): { inlineData: { mimeType: string; data: string } } {
  const virgule = dataUrl.indexOf(',')
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(';'))
  return { inlineData: { mimeType, data: dataUrl.slice(virgule + 1) } }
}
