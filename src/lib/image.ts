// Traitement d'image côté client — garde-fou de coûts et de payload :
// toute photo part réduite (≤ 1280 px, JPEG) vers l'état puis vers les endpoints,
// bien en-dessous de la limite de 4,5 Mo des fonctions Vercel. Ré-encode aussi
// le SVG d'exemple en JPEG (les modèles Gemini n'acceptent pas le SVG).

export interface ImageReduite {
  dataUrl: string
  w: number
  h: number
}

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image illisible'))
    img.src = src
  })
}

/**
 * Redimensionne une image (dataURL ou URL même origine) au plus à `maxDim` px
 * de côté long et la ré-encode en JPEG. Renvoie aussi les dimensions finales,
 * nécessaires au calcul d'échelle (cm/pixel) et de placement.
 */
export async function downscaleDataUrl(
  src: string,
  maxDim = 1280,
  quality = 0.85
): Promise<ImageReduite> {
  const img = await chargerImage(src)
  const nw = img.naturalWidth || img.width
  const nh = img.naturalHeight || img.height
  if (nw <= 0 || nh <= 0) throw new Error('Dimensions introuvables')

  const scale = Math.min(1, maxDim / Math.max(nw, nh))
  const w = Math.max(1, Math.round(nw * scale))
  const h = Math.max(1, Math.round(nh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  // Fond blanc : les PNG/SVG transparents deviennent des JPEG propres.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), w, h }
}

/**
 * Convertit une image (dataURL ou URL même origine) en Blob JPEG, sur fond blanc
 * (le JPEG n'a pas d'alpha). Passe par canvas.toBlob → vrai Blob binaire, plus
 * fiable qu'une énorme dataURL pour le téléchargement/partage mobile (iOS).
 */
export async function versJpegBlob(src: string, quality = 0.92): Promise<Blob> {
  const img = await chargerImage(src)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (w <= 0 || h <= 0) throw new Error('Dimensions introuvables')

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encodage JPEG impossible'))),
      'image/jpeg',
      quality
    )
  })
}

/** SHA-256 hexadécimal — clés des caches « 1 analyse par photo, 1 rendu par œuvre ». */
export async function sha256(texte: string): Promise<string> {
  const data = new TextEncoder().encode(texte)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
