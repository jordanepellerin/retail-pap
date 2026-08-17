import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Article } from '../../types'
import { formatPrix, sousTitreArticle } from '../../data/catalogue'
import { alertesTenue, totalTenue } from '../../lib/tenue'
import { CloseIcon } from '../icons'
import VisuelProduit from '../VisuelProduit'

interface PanneauLookProps {
  /** Le look, pièce principale en tête (cf. `composerLook`), moins les écartées. */
  look: Article[]
  /** L'article de la fiche — c'est lui qui a composé le look. */
  idRegarde: string
  /** Taille du look composé, avant écartement : de quoi proposer de le rétablir. */
  nbComplet: number
  onEcarter: (id: string) => void
  onRetablir: () => void
  onFermer: () => void
  onEssayer: () => void
}

/**
 * Tiroir « Acheter le look » — le détail des articles qui composent la tenue
 * autour de la pièce regardée, et, SOUS ce détail, l'entrée vers l'essayage.
 *
 * Il s'ouvre en superposition à droite (voile + panneau), comme le tiroir de
 * navigation (`Nav.tsx`) : le grand visuel reste visible derrière, assombri.
 *
 * Le look proposé n'est pas imposé : chaque pièce peut être écartée, et le
 * retrait passe par une confirmation nommant la pièce — c'est le total, l'achat
 * ET l'essayage qu'il modifie d'un seul geste. Rien n'est perdu pour autant, le
 * look complet se rétablit d'un clic.
 */
export default function PanneauLook({
  look,
  idRegarde,
  nbComplet,
  onEcarter,
  onRetablir,
  onFermer,
  onEssayer
}: PanneauLookProps) {
  const panneauRef = useRef<HTMLDivElement>(null)
  const confirmerRef = useRef<HTMLButtonElement>(null)
  /** Pièce dont le retrait attend confirmation — une seule à la fois. */
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  /** Où rendre le focus si la confirmation est annulée. */
  const retourFocus = useRef<string | null>(null)
  const total = totalTenue(look)
  const alertes = alertesTenue(look)

  // Focus porté dans le panneau à l'ouverture. La fermeture au clavier est
  // gérée par la page, qui seule connaît l'empilement des couches (cf. FicheProduit).
  useEffect(() => {
    panneauRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [])

  // La confirmation prend la PLACE du bouton « Retirer » : sans rien faire, le
  // focus clavier retomberait sur le corps du document à chaque aller-retour.
  // On le pose donc sur la confirmation, et on le rend au bouton d'origine si
  // le visiteur renonce.
  useEffect(() => {
    if (aConfirmer) {
      confirmerRef.current?.focus()
      return
    }
    const id = retourFocus.current
    retourFocus.current = null
    if (id) panneauRef.current?.querySelector<HTMLElement>(`[data-retirer="${id}"]`)?.focus()
  }, [aConfirmer])

  const demanderRetrait = (id: string) => {
    retourFocus.current = id
    setAConfirmer(id)
  }

  const confirmerRetrait = (id: string) => {
    // La ligne disparaît : plus de bouton auquel rendre le focus.
    retourFocus.current = null
    setAConfirmer(null)
    onEcarter(id)
  }

  return (
    <>
      {/* Au-dessus du lanceur du widget (z-50), qui occupe le même coin que le
          bouton « Essayer le look » et le recouvrirait sinon. */}
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={onFermer} aria-hidden="true" />

      <aside
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-label="Acheter le look"
        className="anim-widget-open fixed inset-y-0 right-0 z-[60] flex w-[min(460px,100vw)] flex-col bg-blanc-pur shadow-[0_0_60px_rgba(0,0,0,0.2)]"
      >
        <header className="relative shrink-0 border-b border-gris-bordure px-6 py-5">
          <h2 className="text-center font-serif text-[26px] leading-none text-noir-encre">
            Acheter le look
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer le look"
            className="absolute right-5 top-1/2 -translate-y-1/2 text-noir-encre transition-opacity hover:opacity-60"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="widget-scroll flex-1 overflow-y-auto px-6 py-6">
          <ul className="space-y-5">
            {look.map((article) => (
              <li key={article.id} className="flex gap-4">
                <Link
                  to={`/produit/${article.id}`}
                  onClick={onFermer}
                  className="block w-[104px] shrink-0 overflow-hidden bg-gris-clair"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <div className="aspect-[3/4]">
                    <VisuelProduit
                      article={article}
                      decoratif
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/produit/${article.id}`}
                    onClick={onFermer}
                    className="font-sans text-[13px] font-medium leading-snug text-noir-encre underline-offset-4 hover:underline"
                  >
                    {article.couleur} {article.nom}
                  </Link>
                  <p className="mt-1 font-sans text-[12px] font-light text-gris-texte">
                    {sousTitreArticle(article)}
                  </p>
                  <p className="mt-1 font-sans text-[13px] text-noir-encre">
                    {formatPrix(article.prix)}
                  </p>
                  {/* La pièce regardée est rappelée : c'est elle qui a composé le
                      look. Repérée par son id et non par sa position — elle peut
                      être écartée comme une autre, et la tête de liste revient
                      alors à une pièce qui, elle, n'est pas « regardée ». */}
                  {article.id === idRegarde && (
                    <p className="mt-1 font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-sable">
                      La pièce que vous regardez
                    </p>
                  )}

                  {aConfirmer === article.id ? (
                    <div className="mt-2 border-l-2 border-sable bg-sable/[0.08] px-3 py-2.5">
                      <p className="font-sans text-[12px] font-light leading-relaxed text-noir-encre">
                        Retirer « {article.nom} » du look ?
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          ref={confirmerRef}
                          type="button"
                          onClick={() => confirmerRetrait(article.id)}
                          className="border border-noir-encre bg-noir-encre px-3.5 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-80"
                        >
                          Retirer
                        </button>
                        <button
                          type="button"
                          onClick={() => setAConfirmer(null)}
                          className="border border-gris-bordure px-3.5 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-noir-encre transition-colors hover:border-noir-encre"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button type="button" className="chip-boutique px-4 py-2 text-[12px]">
                        Choisir la taille
                      </button>
                      {/* Une pièce au moins : un look vide n'a plus rien à acheter
                          ni à essayer. */}
                      {look.length > 1 && (
                        <button
                          type="button"
                          data-retirer={article.id}
                          onClick={() => demanderRetrait(article.id)}
                          aria-label={`Retirer ${article.couleur} ${article.nom} du look`}
                          className="font-sans text-[12px] font-light text-gris-texte underline-offset-4 transition-colors hover:text-noir-encre hover:underline"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Le retrait est confirmé, jamais définitif : le look composé reste à
              un clic. */}
          {look.length < nbComplet && (
            <button
              type="button"
              onClick={onRetablir}
              className="mt-6 w-full text-center font-sans text-[12px] font-light text-gris-texte underline-offset-4 transition-colors hover:text-noir-encre hover:underline"
            >
              Rétablir le look complet ({nbComplet} pièces) →
            </button>
          )}

          {alertes.length > 0 && (
            <ul className="mt-6 space-y-1.5 border-l-2 border-sable bg-sable/[0.08] px-3 py-2.5">
              {alertes.map((a) => (
                <li key={a} className="font-sans text-[11.5px] font-light leading-relaxed text-gris-texte">
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-gris-bordure px-6 py-5">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-gris-texte">
              Total du look · {look.length} pièce{look.length > 1 ? 's' : ''}
            </span>
            <span className="font-serif text-[22px] text-noir-encre">{formatPrix(total)}</span>
          </div>

          <button type="button" onClick={onEssayer} className="btn-dark mt-4 w-full py-4">
            Essayer le look
          </button>
          <p className="mt-2 text-center font-sans text-[11px] font-light text-gris-texte">
            Sur votre photo, en quelques secondes.
          </p>
        </footer>
      </aside>
    </>
  )
}
