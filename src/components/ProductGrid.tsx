import { useMemo, useState } from 'react'
import type { Article, Categorie } from '../types'
import {
  CATALOGUE,
  LIBELLES_CATEGORIE,
  declinaisons,
  formatPrix,
  pastilleCouleur,
  sousTitreArticle,
  surErreurVisuel,
  visuelArticle
} from '../data/catalogue'

type Tri = 'recommande' | 'prix-croissant' | 'prix-decroissant'

const LIBELLES_TRI: Record<Tri, string> = {
  recommande: 'Recommandés',
  'prix-croissant': 'Prix croissant',
  'prix-decroissant': 'Prix décroissant'
}

/** Remises de démonstration, par identifiant d'article. */
const REMISES: Record<string, number> = { c3: 30, c4: 30, v3: 30, p5: 20, h5: 20 }

/** Articles marqués « Nouveauté » sur la vitrine. */
const NOUVEAUTES = new Set(['v4', 'c8', 'p3', 'h4'])

export function CarteProduit({ article }: { article: Article }) {
  const remise = REMISES[article.id]
  const nouveaute = NOUVEAUTES.has(article.id)
  const { src, secours } = visuelArticle(article)
  const coloris = declinaisons(article)

  return (
    <article className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-gris-clair">
        <img
          src={src}
          alt={`${article.nom} — ${article.couleur}`}
          loading="lazy"
          onError={(e) => surErreurVisuel(e, secours)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {remise ? (
          <span className="absolute left-0 top-4 bg-noir-encre px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-white">
            {remise}&nbsp;% de réduction
          </span>
        ) : nouveaute ? (
          <span className="absolute left-0 top-4 bg-noir-encre px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-white">
            Nouveauté
          </span>
        ) : null}
      </div>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-sans text-[13px] font-medium text-noir-encre">
            {article.couleur} {article.nom}
          </h3>
          <p className="shrink-0 font-sans text-[13px]">
            {remise ? (
              <>
                <span className="text-rouge-solde">
                  {formatPrix(Math.round((article.prix * (100 - remise)) / 100))}
                </span>
                <span className="ml-2 text-gris-texte line-through">
                  {formatPrix(article.prix)}
                </span>
              </>
            ) : (
              <span className="text-noir-encre">{formatPrix(article.prix)}</span>
            )}
          </p>
        </div>
        {/* Métadonnées : matière et coupe, comme sur une fiche produit réelle */}
        <p className="mt-0.5 font-sans text-[12px] font-light text-gris-texte">
          {sousTitreArticle(article)}
        </p>
        {/* Nuancier : les autres coloris réellement au catalogue sous ce nom */}
        {coloris.length > 1 && (
          <div className="mt-2 flex gap-1.5">
            {coloris.map((c) => (
              <span
                key={c.id}
                title={c.couleur}
                aria-label={c.couleur}
                className={`h-3.5 w-3.5 border ${
                  c.id === article.id ? 'border-noir-encre' : 'border-gris-bordure'
                }`}
                style={{ background: pastilleCouleur(c) }}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

/** Grille nue d'une famille, sans barre de filtre — pour les sections secondaires. */
export function SectionCategorie({ categorie }: { categorie: Categorie }) {
  const articles = CATALOGUE.filter((a) => a.categorie === categorie)
  if (articles.length === 0) return null

  return (
    <section id={`famille-${categorie}`} className="mx-auto max-w-content px-4 pb-20 sm:px-8">
      <div className="flex items-baseline justify-between border-b border-gris-bordure pb-5">
        <h2 className="font-serif text-[32px] leading-none sm:text-[38px]">
          {LIBELLES_CATEGORIE[categorie].pluriel}
        </h2>
        <span className="font-sans text-[12px] font-light text-gris-texte">
          {articles.length} article{articles.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 pt-8 lg:grid-cols-4">
        {articles.map((a) => (
          <CarteProduit key={a.id} article={a} />
        ))}
      </div>
    </section>
  )
}

/**
 * Grille principale de la page catégorie (Costumes), avec barre de filtre et de
 * tri. Le tri est réel ; le bouton « Filtre » est décoratif — la vraie
 * qualification, c'est le widget.
 */
export default function ProductGrid() {
  const [tri, setTri] = useState<Tri>('recommande')
  const [triOuvert, setTriOuvert] = useState(false)

  const articles = useMemo(() => {
    const costumes = CATALOGUE.filter((a) => a.categorie === 'costume')
    if (tri === 'prix-croissant') return [...costumes].sort((a, b) => a.prix - b.prix)
    if (tri === 'prix-decroissant') return [...costumes].sort((a, b) => b.prix - a.prix)
    return costumes
  }, [tri])

  return (
    <section id="grille-produits" className="mx-auto max-w-content px-4 pb-20 sm:px-8">
      <div className="flex items-center justify-between border-b border-gris-bordure py-5">
        <button
          type="button"
          className="font-serif text-[19px] text-noir-encre transition-opacity hover:opacity-60"
        >
          Filtre <span className="ml-1 font-sans text-[15px]">+</span>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTriOuvert((v) => !v)}
            aria-expanded={triOuvert}
            className="font-serif text-[19px] text-noir-encre transition-opacity hover:opacity-60"
          >
            Trier <span className="ml-1 font-sans text-[15px]">+</span>
          </button>
          {triOuvert && (
            <ul className="absolute right-0 top-full z-20 mt-2 w-56 border border-gris-bordure bg-blanc-pur py-1 shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
              {(Object.keys(LIBELLES_TRI) as Tri[]).map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => {
                      setTri(t)
                      setTriOuvert(false)
                    }}
                    className={`block w-full px-4 py-2.5 text-left font-sans text-[13px] transition-colors hover:bg-gris-clair ${
                      tri === t ? 'text-noir-encre' : 'text-gris-texte'
                    }`}
                  >
                    {LIBELLES_TRI[t]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 pt-8 lg:grid-cols-4">
        {articles.map((a) => (
          <CarteProduit key={a.id} article={a} />
        ))}
      </div>
    </section>
  )
}
