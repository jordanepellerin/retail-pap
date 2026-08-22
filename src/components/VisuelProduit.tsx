import { useEffect, useState } from 'react'
import type { Article } from '../types'
import { visuelArticle, visuelsLook } from '../data/catalogue'

interface VisuelProduitProps {
  article: Article
  className?: string
  alt?: string
  loading?: 'lazy' | 'eager'
  /**
   * Montrer le mannequin portant la TENUE COMPLÈTE plutôt que la pièce seule
   * (`<slug>-look.jpg`). Réservé aux endroits qui parlent de LA PIÈCE REGARDÉE :
   * la carte de la grille, le grand visuel de la fiche, et la vignette de tête
   * du tiroir « Acheter le look » — ces trois-là montrent la même pièce et
   * doivent montrer la même photo. Partout ailleurs — pièces qui accompagnent,
   * planche, références envoyées à l'essayage — c'est la pièce qu'on achète
   * qu'il faut voir. Repli automatique sur la photo de pièce quand la photo de
   * look n'existe pas.
   */
  look?: boolean
  /** Vignette purement décorative : masquée aux lecteurs d'écran. */
  decoratif?: boolean
}

/**
 * Visuel d'un article, avec repli le long d'une chaîne de sources : look →
 * photo de pièce → SVG.
 *
 * Le repli DOIT être un état React, pas une écriture impérative sur le nœud
 * DOM : React réécrit `src` depuis les props à chaque re-rendu, ce qui annulait
 * un `img.src = secours` posé dans `onError` — et comme le drapeau « repli déjà
 * appliqué » survivait, lui, au re-rendu, la seconde erreur était ignorée et
 * l'image restait définitivement cassée.
 *
 * L'état est le RANG dans la chaîne, et non un booléen : avec trois sources, un
 * booléen ne saurait pas dire s'il reste un repli à tenter. Arrivé au dernier
 * rang, `onError` n'avance plus — la valeur d'état ne change pas, React ne
 * re-rend pas, et la boucle d'erreur s'arrête d'elle-même.
 */
export default function VisuelProduit({
  article,
  className,
  alt,
  loading,
  look = false,
  decoratif = false
}: VisuelProduitProps) {
  const { src, secours } = visuelArticle(article)
  const sources = look ? visuelsLook(article) : [src, secours]
  const [rang, setRang] = useState(0)

  // Changer d'article réarme la chaîne : le suivant a peut-être ses photos.
  useEffect(() => setRang(0), [article.id, look])

  const dernier = sources.length - 1
  const courant = Math.min(rang, dernier)
  // Le look n'est annoncé que tant qu'il est réellement affiché : dès le repli,
  // l'image ne montre plus que la pièce, et le texte alternatif doit suivre.
  const description =
    look && courant === 0
      ? `${article.nom} — ${article.couleur}, porté avec le look complet`
      : `${article.nom} — ${article.couleur}`

  return (
    <img
      src={sources[courant]}
      alt={decoratif ? '' : (alt ?? description)}
      aria-hidden={decoratif || undefined}
      loading={loading}
      className={className}
      onError={() => setRang((r) => Math.min(r + 1, dernier))}
    />
  )
}
