import { useMemo, useState } from 'react'
import type { Article } from '../types'
import { CATALOGUE, formatPrix } from '../data/catalogue'

type Tri = 'recommande' | 'prix-croissant' | 'prix-decroissant'

const LIBELLES_TRI: Record<Tri, string> = {
  recommande: 'Recommandés',
  'prix-croissant': 'Prix croissant',
  'prix-decroissant': 'Prix décroissant'
}

/** Remises de démonstration, par identifiant d'article. */
const REMISES: Record<string, number> = { c3: 30, c4: 30, v3: 30, p5: 20, h5: 20 }

function CarteProduit({ article }: { article: Article }) {
  const remise = REMISES[article.id]
  return (
    <article className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-craie">
        <img
          src={article.image}
          alt={`${article.nom} — ${article.couleur}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {remise && (
          <span className="absolute left-0 top-4 bg-bordeaux px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-white">
            {remise}&nbsp;% de réduction
          </span>
        )}
      </div>
      <div className="pt-3">
        <h3 className="font-sans text-[13px] text-encre">{article.nom}</h3>
        <p className="mt-0.5 font-sans text-[12px] font-light text-ardoise">{article.couleur}</p>
        <p className="mt-1 font-sans text-[13px]">
          {remise ? (
            <>
              <span className="text-bordeaux">
                {formatPrix(Math.round((article.prix * (100 - remise)) / 100))}
              </span>
              <span className="ml-2 text-ardoise line-through">{formatPrix(article.prix)}</span>
            </>
          ) : (
            <span className="text-encre">{formatPrix(article.prix)}</span>
          )}
        </p>
      </div>
    </article>
  )
}

/**
 * Grille de la page catégorie. Le tri est réel (il agit sur les données) ; le
 * bouton « Filtre » est décoratif — la vraie qualification, c'est le widget.
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
    <section id="grille-produits" className="mx-auto max-w-content px-4 pb-24 sm:px-8">
      <div className="flex items-center justify-between border-b border-filet py-5">
        <button
          type="button"
          className="font-serif text-[19px] text-encre transition-opacity hover:opacity-60"
        >
          Filtre <span className="ml-1 font-sans text-[15px]">+</span>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTriOuvert((v) => !v)}
            aria-expanded={triOuvert}
            className="font-serif text-[19px] text-encre transition-opacity hover:opacity-60"
          >
            Trier <span className="ml-1 font-sans text-[15px]">+</span>
          </button>
          {triOuvert && (
            <ul className="absolute right-0 top-full z-20 mt-2 w-56 border border-filet bg-blanc py-1 shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
              {(Object.keys(LIBELLES_TRI) as Tri[]).map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => {
                      setTri(t)
                      setTriOuvert(false)
                    }}
                    className={`block w-full px-4 py-2.5 text-left font-sans text-[13px] transition-colors hover:bg-craie ${
                      tri === t ? 'text-encre' : 'text-ardoise'
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
