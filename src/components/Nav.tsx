import { useState } from 'react'
import Logo from './Logo'
import { BagIcon, CloseIcon, FlagFrIcon, MenuIcon, SearchIcon } from './icons'

const RUBRIQUES = [
  'Nouveautés',
  'Costumes',
  'Vestes & blazers',
  'Chemises',
  'Pantalons',
  'Maille',
  'Chaussures',
  'Accessoires'
]

/**
 * Barre de navigation de la boutique : icônes à gauche, wordmark centré,
 * langue et panier à droite, filet de 1 px en bas. Le menu détaillé s'ouvre en
 * tiroir — la page catégorie doit rester silencieuse autour du produit.
 */
export default function Nav() {
  const [menuOuvert, setMenuOuvert] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-gris-bordure bg-blanc-pur">
      <div className="relative flex h-[72px] items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            aria-label="Ouvrir le menu"
            className="text-noir-encre transition-opacity hover:opacity-60"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Rechercher"
            className="text-noir-encre transition-opacity hover:opacity-60"
          >
            <SearchIcon className="h-[22px] w-[22px]" />
          </button>
        </div>

        <a
          href="/"
          className="absolute left-1/2 -translate-x-1/2 text-noir-encre"
          aria-label="André Laurent — accueil"
        >
          <Logo large className="hidden sm:inline" />
          <Logo className="sm:hidden" />
        </a>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Changer de langue — français"
            className="flex items-center gap-1 transition-opacity hover:opacity-60"
          >
            <FlagFrIcon className="h-4 w-6 border border-gris-bordure" />
            <span className="text-[10px] text-noir-encre" aria-hidden="true">
              ▾
            </span>
          </button>
          <button
            type="button"
            aria-label="Panier"
            className="text-noir-encre transition-opacity hover:opacity-60"
          >
            <BagIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Tiroir de navigation */}
      {menuOuvert && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMenuOuvert(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Navigation principale"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(340px,85vw)] flex-col bg-blanc-pur px-7 py-6 shadow-[0_0_60px_rgba(0,0,0,0.2)]"
          >
            <button
              type="button"
              onClick={() => setMenuOuvert(false)}
              aria-label="Fermer le menu"
              className="self-end text-noir-encre transition-opacity hover:opacity-60"
            >
              <CloseIcon className="h-6 w-6" />
            </button>
            <ul className="mt-8 space-y-1">
              {RUBRIQUES.map((r) => (
                <li key={r}>
                  <a
                    href="/"
                    className="block border-b border-gris-bordure py-3.5 font-serif text-[20px] text-noir-encre transition-colors hover:text-gris-texte"
                  >
                    {r}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-auto font-sans text-[11px] font-light leading-relaxed text-gris-texte">
              Livraison et retours offerts · Fabrication européenne
            </p>
          </nav>
        </>
      )}
    </header>
  )
}
