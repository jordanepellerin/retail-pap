// Utilitaires pour reproduire les dégradés CSS des œuvres sur un <canvas>,
// afin de composer un rendu téléchargeable (aucune librairie externe).

export interface ParsedGradient {
  angleDeg: number
  stops: string[]
}

/**
 * Analyse un dégradé du format maîtrisé `linear-gradient(<n>deg, c1, c2[, c3])`.
 * Les couleurs sont des hex simples (sans virgule interne), donc un split suffit.
 */
export function parseLinearGradient(css: string): ParsedGradient {
  const open = css.indexOf('(')
  const close = css.lastIndexOf(')')
  const inner = open >= 0 && close > open ? css.slice(open + 1, close) : css
  const parts = inner.split(',').map((s) => s.trim()).filter(Boolean)

  let angleDeg = 145
  if (parts.length && /^-?\d+(\.\d+)?deg$/.test(parts[0])) {
    angleDeg = parseFloat(parts[0])
    parts.shift()
  }
  const stops = parts.length ? parts : ['#8A7B5C', '#3A3225']
  return { angleDeg, stops }
}

/** Dessine le dégradé d'une œuvre dans un rectangle du canvas. */
export function drawGradientRect(
  ctx: CanvasRenderingContext2D,
  css: string,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const { angleDeg, stops } = parseLinearGradient(css)
  const rad = (angleDeg * Math.PI) / 180
  // Angle CSS : 0deg = vers le haut, 90deg = vers la droite (y vers le bas sur canvas).
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const cx = x + w / 2
  const cy = y + h / 2
  const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2

  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half)
  stops.forEach((color, i) => {
    const pos = stops.length === 1 ? 0 : i / (stops.length - 1)
    g.addColorStop(pos, color)
  })
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

/** Dessine une image en mode « cover » (recadrage centré) sur tout le canvas. */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number
): void {
  const iw = img.naturalWidth || W
  const ih = img.naturalHeight || H
  const scale = Math.max(W / iw, H / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
}
