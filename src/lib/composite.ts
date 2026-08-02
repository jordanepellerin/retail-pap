// Composition canvas du rendu — c'est le CODE qui garantit que la photo
// d'origine n'est jamais modifiée : le modèle ne travaille que dans une zone
// masquée autour de l'œuvre, et `recomposerHorsMasque` restaure ensuite les
// pixels d'origine partout ailleurs (garantie mathématique, pas une promesse).

import type { Oeuvre } from '../types'
import type { PointPct, QuadPct, RectPct } from '../types/ai'
import { drawGradientRect } from './gradient'

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image illisible'))
    img.src = src
  })
}

interface Pt {
  x: number
  y: number
}

/**
 * Dessine un triangle de l'image source vers un triangle destination, via la
 * transformation affine qui mappe l'un sur l'autre (setTransform + clip).
 * Brique du maillage de déformation perspective.
 */
function dessinerTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: Pt, s1: Pt, s2: Pt,
  d0: Pt, d1: Pt, d2: Pt
): void {
  const denom = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y)
  if (Math.abs(denom) < 1e-6) return
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / denom
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / denom
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / denom
  const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / denom
  const e = d0.x - a * s0.x - c * s0.y
  const f = d0.y - b * s0.x - d * s0.y

  ctx.save()
  ctx.beginPath()
  // Léger débord pour éviter les fines coutures entre triangles voisins.
  ctx.moveTo(d0.x, d0.y)
  ctx.lineTo(d1.x, d1.y)
  ctx.lineTo(d2.x, d2.y)
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

/** Interpolation bilinéaire dans un quad px [tl,tr,br,bl]. */
function bilin(q: [Pt, Pt, Pt, Pt], u: number, v: number): Pt {
  const [tl, tr, br, bl] = q
  const hx = tl.x + u * (tr.x - tl.x)
  const hy = tl.y + u * (tr.y - tl.y)
  const bx = bl.x + u * (br.x - bl.x)
  const by = bl.y + u * (br.y - bl.y)
  return { x: hx + v * (bx - hx), y: hy + v * (by - hy) }
}

/**
 * Déforme une image dans un quad destination par maillage (N×N cellules,
 * mapping bilinéaire) → rend visuellement la perspective sans dépendance IA.
 */
function deformerDansQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  quadPx: [Pt, Pt, Pt, Pt],
  n = 16
): void {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u0 = i / n
      const u1 = (i + 1) / n
      const v0 = j / n
      const v1 = (j + 1) / n
      // Coins source (px image) et destination (px canvas).
      const sTL = { x: u0 * iw, y: v0 * ih }
      const sTR = { x: u1 * iw, y: v0 * ih }
      const sBR = { x: u1 * iw, y: v1 * ih }
      const sBL = { x: u0 * iw, y: v1 * ih }
      const dTL = bilin(quadPx, u0, v0)
      const dTR = bilin(quadPx, u1, v0)
      const dBR = bilin(quadPx, u1, v1)
      const dBL = bilin(quadPx, u0, v1)
      dessinerTriangle(ctx, img, sTL, sTR, sBR, dTL, dTR, dBR)
      dessinerTriangle(ctx, img, sTL, sBR, sBL, dTL, dBR, dBL)
    }
  }
}

/**
 * RENDU FINAL 100 % code : la photo d'origine (jamais modifiée) + l'œuvre exacte
 * déformée dans le quad de perspective, avec une ombre portée douce. Aucune IA.
 * Repli sur le dégradé de l'œuvre si son image ne charge pas.
 */
export async function composerPerspective(
  photoSrc: string,
  oeuvre: Oeuvre,
  quadPct: QuadPct,
  ombre = true
): Promise<string> {
  const photo = await chargerImage(photoSrc)
  const W = photo.naturalWidth
  const H = photo.naturalHeight
  if (W <= 0 || H <= 0) throw new Error('Photo illisible')

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(photo, 0, 0, W, H)

  const quadPx: [Pt, Pt, Pt, Pt] = quadPct.map((p: PointPct) => ({
    x: (p.x / 100) * W,
    y: (p.y / 100) * H
  })) as [Pt, Pt, Pt, Pt]

  // Ombre portée code (désactivée quand l'IA va harmoniser : évite le doublon).
  if (ombre) {
    const dec = Math.max(3, W * 0.006)
    ctx.save()
    ctx.filter = `blur(${Math.max(4, W * 0.008)}px)`
    ctx.fillStyle = 'rgba(0,0,0,0.34)'
    ctx.beginPath()
    ctx.moveTo(quadPx[0].x + dec, quadPx[0].y + dec)
    ctx.lineTo(quadPx[1].x + dec, quadPx[1].y + dec)
    ctx.lineTo(quadPx[2].x + dec, quadPx[2].y + dec)
    ctx.lineTo(quadPx[3].x + dec, quadPx[3].y + dec)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  try {
    const art = await chargerImage(oeuvre.image)
    deformerDansQuad(ctx, art, quadPx)
    ctx.setTransform(1, 0, 0, 1, 0, 0) // réinitialise après les setTransform du maillage
  } catch {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // Repli dégradé : rect englobant du quad.
    const xs = quadPx.map((p) => p.x)
    const ys = quadPx.map((p) => p.y)
    const rx = Math.min(...xs)
    const ry = Math.min(...ys)
    drawGradientRect(ctx, oeuvre.gradient, rx, ry, Math.max(...xs) - rx, Math.max(...ys) - ry)
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}

/** Zone du rect élargie d'une marge (pour l'ombre portée), bornée à l'image. */
export function rectAvecMarge(rect: RectPct, marge = 0.18): RectPct {
  const mx = rect.w * marge
  const my = rect.h * marge
  const x = Math.max(0, rect.x - mx)
  const y = Math.max(0, rect.y - my)
  return {
    x,
    y,
    w: Math.min(100 - x, rect.w + 2 * mx),
    h: Math.min(100 - y, rect.h + 2 * my)
  }
}

/**
 * Pré-composition : photo + œuvre collée au rect (recadrage « cover »,
 * proportions réelles conservées). `cadre` ajoute un liseré blanc (secours
 * peinture téléchargeable). Base envoyée au modèle d'inpainting.
 */
export async function composerScene(
  photoSrc: string,
  oeuvre: Oeuvre,
  rect: RectPct,
  cadre: boolean
): Promise<string> {
  const photo = await chargerImage(photoSrc)
  const W = photo.naturalWidth
  const H = photo.naturalHeight
  if (W <= 0 || H <= 0) throw new Error('Photo illisible')

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.drawImage(photo, 0, 0, W, H)

  const rx = (rect.x / 100) * W
  const ry = (rect.y / 100) * H
  const rw = (rect.w / 100) * W
  const rh = (rect.h / 100) * H

  try {
    const art = await chargerImage(oeuvre.image)
    const iw = art.naturalWidth
    const ih = art.naturalHeight
    const scale = Math.max(rw / iw, rh / ih) // « cover »
    const sw = rw / scale
    const sh = rh / scale
    ctx.drawImage(art, (iw - sw) / 2, (ih - sh) / 2, sw, sh, rx, ry, rw, rh)
  } catch {
    drawGradientRect(ctx, oeuvre.gradient, rx, ry, rw, rh)
  }

  if (cadre) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = Math.max(4, W * 0.006)
    ctx.strokeRect(rx, ry, rw, rh)
  }
  return canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * Masque d'inpainting aux dimensions exactes de la photo : blanc = zone
 * éditable (marge autour de l'œuvre), noir = à préserver.
 */
export async function construireMasque(photoSrc: string, marge: RectPct): Promise<string> {
  const photo = await chargerImage(photoSrc)
  const W = photo.naturalWidth
  const H = photo.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect((marge.x / 100) * W, (marge.y / 100) * H, (marge.w / 100) * W, (marge.h / 100) * H)
  return canvas.toDataURL('image/png')
}

/**
 * GARANTIE anti-modification : reprend la photo d'origine intégralement, puis
 * n'y recolle QUE la zone de marge du rendu du modèle. Tout pixel hors de cette
 * zone est strictement celui de la photo d'origine, quoi qu'ait produit le modèle.
 */
export async function recomposerHorsMasque(
  photoSrc: string,
  renduModeleSrc: string,
  marge: RectPct
): Promise<string> {
  const [photo, rendu] = await Promise.all([chargerImage(photoSrc), chargerImage(renduModeleSrc)])
  const W = photo.naturalWidth
  const H = photo.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.drawImage(photo, 0, 0, W, H)

  // Le rendu peut avoir d'autres dimensions : on mappe la même zone en %.
  const rw = rendu.naturalWidth
  const rh = rendu.naturalHeight
  const sx = (marge.x / 100) * rw
  const sy = (marge.y / 100) * rh
  const sw = (marge.w / 100) * rw
  const sh = (marge.h / 100) * rh
  const dx = (marge.x / 100) * W
  const dy = (marge.y / 100) * H
  const dw = (marge.w / 100) * W
  const dh = (marge.h / 100) * H
  ctx.drawImage(rendu, sx, sy, sw, sh, dx, dy, dw, dh)
  return canvas.toDataURL('image/jpeg', 0.92)
}
