import { useEffect, useState } from 'react'
import type { Article } from '../types'
import { visuelArticle } from '../data/catalogue'

interface VisuelProduitProps {
  article: Article
  className?: string
  alt?: string
  loading?: 'lazy' | 'eager'
  /** Vignette purement décorative : masquée aux lecteurs d'écran. */
  decoratif?: boolean
}

/**
 * Visuel d'un article, avec repli photo → SVG.
 *
 * Le repli DOIT être un état React, pas une écriture impérative sur le nœud
 * DOM : React réécrit `src` depuis les props à chaque re-rendu, ce qui annulait
 * un `img.src = secours` posé dans `onError` — et comme le drapeau « repli déjà
 * appliqué » survivait, lui, au re-rendu, la seconde erreur était ignorée et
 * l'image restait définitivement cassée.
 */
export default function VisuelProduit({
  article,
  className,
  alt,
  loading,
  decoratif = false
}: VisuelProduitProps) {
  const { src, secours } = visuelArticle(article)
  const [echec, setEchec] = useState(false)

  // Changer d'article réarme la tentative photo : le suivant en a peut-être une.
  useEffect(() => setEchec(false), [article.id])

  return (
    <img
      src={echec ? secours : src}
      alt={decoratif ? '' : (alt ?? `${article.nom} — ${article.couleur}`)}
      aria-hidden={decoratif || undefined}
      loading={loading}
      className={className}
      onError={() => setEchec(true)}
    />
  )
}
