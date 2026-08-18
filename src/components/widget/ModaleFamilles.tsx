import { useEffect, useRef, useState } from 'react'
import type { Categorie } from '../../types'
import { LIBELLES_CATEGORIE } from '../../data/catalogue'
import { PrimaryButton, SecondaryButton } from './ui'

interface ModaleFamillesProps {
  /** Familles proposables, déjà filtrées par l'appelant. Jamais vide. */
  familles: { categorie: Categorie; disponibles: number }[]
  onAjouter: (choisies: Categorie[]) => void
  onFermer: () => void
}

/**
 * Choix des familles à ajouter à la sélection, en plusieurs à la fois.
 *
 * Se superpose au panneau du widget, pas à la page : positionnement `absolute`
 * résolu par le conteneur du panneau (`relative` dans WidgetPanel), qui la
 * rogne à ses propres bords.
 */
export default function ModaleFamilles({ familles, onAjouter, onFermer }: ModaleFamillesProps) {
  const [choisies, setChoisies] = useState<Categorie[]>([])
  const boiteRef = useRef<HTMLDivElement>(null)
  const fermerRef = useRef(onFermer)
  fermerRef.current = onFermer

  // Échap ferme la fenêtre — et ELLE SEULE. `Widget` écoute déjà Échap sur
  // window pour refermer le widget entier, et son écouteur est inscrit avant le
  // nôtre : en phase de bulle, il partirait aussi. On écoute donc en phase de
  // CAPTURE, qui passe en premier, pour couper la propagation à la source.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      fermerRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    boiteRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const basculer = (categorie: Categorie) => {
    setChoisies((precedent) =>
      precedent.includes(categorie)
        ? precedent.filter((c) => c !== categorie)
        : [...precedent, categorie]
    )
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end sm:justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onFermer}
        aria-hidden="true"
      />

      <div
        ref={boiteRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter des familles à la sélection"
        className="anim-widget-open relative m-3 flex max-h-[calc(100%-24px)] flex-col border border-gris-bordure bg-blanc-pur shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
      >
        <header className="relative shrink-0 border-b border-gris-bordure px-5 py-4">
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-sable">
            Compléter la tenue
          </p>
          <h3 className="mt-1 font-serif text-[19px] leading-snug text-noir-encre">
            Quelles familles voulez-vous voir&nbsp;?
          </h3>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-[18px] text-gris-texte transition-colors hover:bg-gris-clair hover:text-noir-encre"
          >
            ×
          </button>
        </header>

        <div className="widget-scroll flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {familles.map(({ categorie, disponibles }) => {
              const actif = choisies.includes(categorie)
              return (
                <li key={categorie}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 border px-4 py-3 transition-all duration-200 ${
                      actif
                        ? 'border-noir-encre bg-gris-clair'
                        : 'border-gris-bordure hover:border-noir-encre hover:bg-gris-clair'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={actif}
                      onChange={() => basculer(categorie)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[12px] transition-colors ${
                        actif
                          ? 'border-noir-encre bg-noir-encre text-white'
                          : 'border-gris-bordure text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1 font-sans text-[13.5px] text-noir-encre">
                      {LIBELLES_CATEGORIE[categorie].pluriel}
                    </span>
                    <span className="shrink-0 font-sans text-[11px] font-light text-gris-texte">
                      {disponibles} pièce{disponibles > 1 ? 's' : ''}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="shrink-0 space-y-2.5 border-t border-gris-bordure p-4">
          <PrimaryButton onClick={() => onAjouter(choisies)} disabled={choisies.length === 0}>
            {choisies.length === 0
              ? 'Choisissez une famille'
              : `Ajouter ${choisies.length} famille${choisies.length > 1 ? 's' : ''}`}
          </PrimaryButton>
          <SecondaryButton onClick={onFermer}>Annuler</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
