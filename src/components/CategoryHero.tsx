import { useState } from 'react'
import { parId, surErreurVisuel, visuelArticle } from '../data/catalogue'

const SOUS_CATEGORIES = ['Costumes en lin', 'Smoking', 'Costumes en laine', 'Velours']

const DESCRIPTION = `Un costume pour homme — un costume parfait est un élément essentiel dans la garde-robe de tout homme. Rien ne vaut la sensation de porter un costume bien taillé, confectionné à partir de matériaux de première qualité. Nos costumes sont dessinés à Paris et fabriqués en Europe, dans des laines peignées, des lins et des flanelles sélectionnés chez des tisseurs italiens et portugais.

Chaque pièce se vend séparément : vous choisissez la taille de la veste et celle du pantalon indépendamment, pour un tombé juste sans passer par la retouche. Veste seule sur un chino, pantalon seul avec une maille, ou l'ensemble pour les occasions qui le demandent — un bon costume est celui qui se porte souvent.`

/**
 * En-tête de page catégorie : fil d'Ariane, grand titre serif, description
 * repliée derrière « Lire plus », visuel à droite. C'est la structure de page
 * standard du prêt-à-porter haut de gamme.
 */
export default function CategoryHero() {
  const [deplie, setDeplie] = useState(false)
  const article = parId('c3')
  const visuel = visuelArticle(article)

  return (
    <section className="mx-auto max-w-content px-4 sm:px-8">
      <nav aria-label="Fil d'Ariane" className="py-6 font-sans text-[13px]">
        <a href="/" className="text-gris-texte transition-colors hover:text-noir-encre">
          Accueil
        </a>
        <span className="px-2 text-gris-texte" aria-hidden="true">
          /
        </span>
        <span className="text-noir-encre">Costumes</span>
      </nav>

      <div className="grid items-center gap-10 pb-4 lg:grid-cols-2">
        <div className="text-center lg:pr-10">
          <h1 className="font-serif text-[54px] font-normal leading-[1.05] sm:text-[68px]">
            Costumes
          </h1>
          <div
            className={`mx-auto mt-7 max-w-[520px] font-sans text-[15px] font-light leading-[1.75] text-gris-texte ${
              deplie ? '' : 'max-h-[118px] overflow-hidden texte-replie'
            }`}
          >
            {DESCRIPTION.split('\n\n').map((p) => (
              <p key={p.slice(0, 24)} className="mb-4 last:mb-0">
                {p}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDeplie((v) => !v)}
            aria-expanded={deplie}
            className="mt-5 border-b border-noir-encre pb-1 font-sans text-[12px] font-medium uppercase tracking-[0.16em] text-noir-encre transition-opacity hover:opacity-60"
          >
            {deplie ? 'Réduire' : 'Lire plus'}
          </button>
        </div>

        <div className="order-first aspect-[4/3] w-full overflow-hidden bg-gris-clair lg:order-none">
          <img
            src={visuel.src}
            alt={`${article.nom} — ${article.couleur}`}
            onError={(e) => surErreurVisuel(e, visuel.secours)}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pb-2 pt-10">
        {SOUS_CATEGORIES.map((s) => (
          <button key={s} type="button" className="chip-boutique">
            {s}
          </button>
        ))}
      </div>
    </section>
  )
}
