// Planche « flat lay » de la tenue — le repli du rendu IA.
//
// Elle sert dans deux cas : le visiteur n'a pas donné de photo, ou la
// génération a échoué (clé absente, réseau, modèle). Dans les deux cas, il
// repart avec un visuel de sa tenue plutôt qu'avec un écran d'erreur.

import type { Article } from '../types'
import { formatPrix } from '../data/catalogue'
import { chargerImage } from './image'
import { drawGradientRect } from './gradient'

const L = 900
const H = 1200
const FOND = '#F4F1EA'
const ENCRE = '#16202E'
const BORDEAUX = '#7B2D3B'

/** Dessine une image en mode « contain » dans un rectangle. */
function dessinerContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const iw = img.naturalWidth || w
  const ih = img.naturalHeight || h
  const echelle = Math.min(w / iw, h / ih)
  const dw = iw * echelle
  const dh = ih * echelle
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** Coupe un texte trop long pour la largeur donnée, avec une ellipse. */
function tronquer(ctx: CanvasRenderingContext2D, texte: string, largeurMax: number): string {
  if (ctx.measureText(texte).width <= largeurMax) return texte
  let court = texte
  while (court.length > 1 && ctx.measureText(`${court}…`).width > largeurMax) {
    court = court.slice(0, -1)
  }
  return `${court}…`
}

/**
 * Compose la planche et renvoie sa dataURL PNG. Chaque visuel manquant retombe
 * sur le dégradé de l'article : la planche est toujours complète.
 */
export async function composerPlanche(articles: Article[], sousTitre: string): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')

  ctx.fillStyle = FOND
  ctx.fillRect(0, 0, L, H)

  // En-tête
  ctx.textAlign = 'center'
  ctx.fillStyle = ENCRE
  ctx.font = "600 40px Spectral, Georgia, serif"
  ctx.fillText('ANDRÉ LAURENT', L / 2, 78)
  ctx.fillStyle = BORDEAUX
  ctx.fillRect(L / 2 - 40, 98, 80, 2)
  ctx.fillStyle = '#5C6675'
  ctx.font = '300 20px Archivo, system-ui, sans-serif'
  ctx.fillText(tronquer(ctx, sousTitre, L - 120), L / 2, 138)

  // Grille : 1, 2 ou 3 colonnes selon le nombre de pièces — une pièce seule
  // occupe toute la largeur plutôt que de laisser une moitié vide.
  const colonnes = articles.length === 1 ? 1 : articles.length <= 4 ? 2 : 3
  const lignes = Math.ceil(articles.length / colonnes)
  const marge = 60
  const gouttiere = 28
  const largeurCase = (L - marge * 2 - gouttiere * (colonnes - 1)) / colonnes
  const hauteurDispo = H - 240 - 90
  const hauteurCase = Math.min(largeurCase * 1.5, hauteurDispo / Math.max(lignes, 1) - gouttiere)
  const hauteurVisuel = hauteurCase - 66
  const departY = 190

  const images = await Promise.all(
    articles.map((a) => chargerImage(a.image).catch(() => null))
  )

  articles.forEach((article, i) => {
    const col = i % colonnes
    const ligne = Math.floor(i / colonnes)
    const x = marge + col * (largeurCase + gouttiere)
    const y = departY + ligne * (hauteurCase + gouttiere)

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x, y, largeurCase, hauteurVisuel)
    const img = images[i]
    if (img) {
      dessinerContain(ctx, img, x, y, largeurCase, hauteurVisuel)
    } else {
      drawGradientRect(ctx, article.gradient, x, y, largeurCase, hauteurVisuel)
    }
    ctx.strokeStyle = '#DAD5CA'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, largeurCase - 1, hauteurVisuel - 1)

    ctx.textAlign = 'left'
    ctx.fillStyle = ENCRE
    ctx.font = "500 21px Spectral, Georgia, serif"
    ctx.fillText(tronquer(ctx, article.nom, largeurCase), x, y + hauteurVisuel + 30)
    ctx.fillStyle = '#5C6675'
    ctx.font = '300 15px Archivo, system-ui, sans-serif'
    ctx.fillText(
      tronquer(ctx, `${article.couleur} · ${formatPrix(article.prix)}`, largeurCase),
      x,
      y + hauteurVisuel + 54
    )
  })

  // Pied de planche
  const total = articles.reduce((s, a) => s + a.prix, 0)
  ctx.textAlign = 'center'
  ctx.fillStyle = ENCRE
  ctx.font = '500 18px Archivo, system-ui, sans-serif'
  ctx.fillText(`Total de la tenue — ${formatPrix(total)}`, L / 2, H - 52)
  ctx.fillStyle = '#5C6675'
  ctx.font = '300 14px Archivo, system-ui, sans-serif'
  ctx.fillText('Visuel non contractuel', L / 2, H - 28)

  return canvas.toDataURL('image/png')
}
