import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { Article } from '../../types'
import { RENDER_ARTICLES_MAX } from '../../types/ai'
import { formatPrix } from '../../data/catalogue'
import { rendre } from '../../lib/aiClient'
import { downscaleDataUrl } from '../../lib/image'
import { visuelsPourRendu } from '../../lib/look'
import { partagerOuTelecharger, preparerFichierJpg } from '../../lib/partage'
import { composerPlanche } from '../../lib/planche'
import { totalTenue } from '../../lib/tenue'
import { CloseIcon, DownloadIcon } from '../icons'
import Logo from '../Logo'
import VisuelProduit from '../VisuelProduit'

interface ModaleEssayageProps {
  /** Le look à essayer, pièce principale en tête. */
  look: Article[]
  onFermer: () => void
}

type Phase = 'photo' | 'rendu'
type Statut = 'idle' | 'pending' | 'done' | 'error'

const NOM_FICHIER = 'andre-laurent-essayage.jpg'
/** Silhouette d'exemple servie localement — essayer sans se photographier. */
const EXEMPLE_IMAGE = '/exemples/mannequin.svg'

/**
 * Essayage du look sur la photo du visiteur.
 *
 * Le parcours tient en deux temps : la photo et les pièces retenues, puis le
 * rendu. Tout s'appuie sur l'existant — la même
 * réduction d'image (`downscaleDataUrl`), le même endpoint (`rendre` →
 * /api/render), et le même repli qu'ailleurs : si le rendu n'aboutit pas, la
 * planche « flat lay » du look s'affiche. Personne ne repart sur une erreur.
 */
export default function ModaleEssayage({ look, onFermer }: ModaleEssayageProps) {
  const dialogueRef = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<Phase>('photo')
  const [photo, setPhoto] = useState<string | null>(null)
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  const [retenus, setRetenus] = useState<Set<string>>(() => new Set(look.map((a) => a.id)))
  const [statut, setStatut] = useState<Statut>('idle')
  const [image, setImage] = useState<string | null>(null)
  const [planche, setPlanche] = useState<string | null>(null)
  const [fichierJpg, setFichierJpg] = useState<File | null>(null)

  const principal = look[0]
  const pieces = useMemo(
    () => look.filter((a) => retenus.has(a.id)).slice(0, RENDER_ARTICLES_MAX),
    [look, retenus]
  )
  const visuel = image ?? planche

  // ── Fenêtre modale : focus, et fond figé pendant l'ouverture ──────────────
  // Dépendances vides, et surtout PAS `onFermer` : un effet qui se ré-abonne à
  // chaque rendu est un piège pour les événements clavier (un écouteur retiré
  // pendant la propagation d'une touche n'est jamais appelé pour cette touche).
  // La fermeture au clavier est donc gérée par la page, cf. FicheProduit.
  useEffect(() => {
    dialogueRef.current?.focus()
    const overflowPrecedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowPrecedent
    }
  }, [])

  // ── Photo ─────────────────────────────────────────────────────────────────
  // Toute image (fichier importé ou silhouette SVG) est réduite ≤ 1280 px et
  // ré-encodée en JPEG : payload léger, et les modèles refusent le SVG.
  const integrer = async (src: string) => {
    setErreurPhoto(null)
    try {
      const { dataUrl } = await downscaleDataUrl(src)
      setPhoto(dataUrl)
    } catch {
      setErreurPhoto('Cette image n’a pas pu être lue — essayez un JPG ou un PNG.')
    }
  }

  const onFichier = (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void integrer(reader.result)
    }
    reader.onerror = () => setErreurPhoto('Ce fichier n’a pas pu être ouvert.')
    reader.readAsDataURL(fichier)
    e.target.value = '' // ré-importer le même fichier doit rester possible
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const notes = `Look complet autour de « ${principal.nom} » ${principal.couleur.toLowerCase()}. ${principal.descriptionCourte}`

  const lancerEssayage = async () => {
    if (!photo || pieces.length === 0) return
    setPhase('rendu')
    setStatut('pending')
    setImage(null)
    setPlanche(null)
    try {
      const articles = await visuelsPourRendu(pieces)
      const rendu = await rendre({ photo, articles, notes })
      if (rendu) {
        setImage(rendu)
        setStatut('done')
        return
      }
    } catch {
      // Traité comme un échec : la planche prend le relais ci-dessous.
    }
    setStatut('error')
  }

  // Repli : la planche « flat lay » du look, composée seulement si elle sert.
  useEffect(() => {
    if (statut !== 'error') return
    let annule = false
    composerPlanche(pieces, `Look ${principal.nom}`)
      .then((url) => {
        if (!annule) setPlanche(url)
      })
      .catch(() => {
        if (!annule) setPlanche(null)
      })
    return () => {
      annule = true
    }
  }, [statut, pieces, principal.nom])

  // Fichier JPG prêt AVANT le clic : sur iOS, le partage natif doit rester dans
  // le geste utilisateur.
  useEffect(() => {
    if (!visuel) {
      setFichierJpg(null)
      return
    }
    let annule = false
    preparerFichierJpg(visuel, NOM_FICHIER)
      .then((fichier) => {
        if (!annule) setFichierJpg(fichier)
      })
      .catch(() => {
        if (!annule) setFichierJpg(null)
      })
    return () => {
      annule = true
    }
  }, [visuel])

  const basculerPiece = (id: string) => {
    setRetenus((precedent) => {
      const suivant = new Set(precedent)
      // Une pièce au moins : un essayage sans vêtement n'a pas de sens.
      if (suivant.has(id)) {
        if (suivant.size === 1) return precedent
        suivant.delete(id)
      } else {
        suivant.add(id)
      }
      return suivant
    })
  }

  const recommencer = () => {
    setPhase('photo')
    setStatut('idle')
    setImage(null)
    setPlanche(null)
  }

  const telecharger = async () => {
    if (!visuel) return
    await partagerOuTelecharger(visuel, fichierJpg, {
      nom: NOM_FICHIER,
      titre: 'Mon look André Laurent'
    })
  }

  return (
    <>
      {/* Encore au-dessus du tiroir du look (z-60), qui reste ouvert derrière. */}
      <div className="fixed inset-0 z-[70] bg-black/70" onClick={onFermer} aria-hidden="true" />

      <div
        ref={dialogueRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-essayage"
        tabIndex={-1}
        className="anim-widget-open fixed inset-2 z-[80] flex flex-col overflow-hidden bg-blanc-pur shadow-[0_40px_100px_rgba(0,0,0,0.5)] outline-none sm:inset-0 sm:m-auto sm:h-[min(760px,calc(100vh-32px))] sm:w-[min(980px,calc(100vw-32px))]"
      >
        <header className="relative shrink-0 border-b border-gris-bordure px-6 py-5">
          <p className="text-center font-sans text-[10px] font-medium uppercase tracking-[0.24em] text-sable">
            Essayage virtuel
          </p>
          <h2
            id="titre-essayage"
            className="mt-1.5 text-center font-serif text-[26px] leading-none text-noir-encre"
          >
            {phase === 'photo' ? 'Essayer le look' : 'Votre essayage'}
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer l’essayage"
            className="absolute right-5 top-1/2 -translate-y-1/2 text-noir-encre transition-opacity hover:opacity-60"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="widget-scroll flex-1 overflow-y-auto">
          <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:px-8">
            {/* ── Colonne gauche : la photo, puis le rendu ── */}
            <div>
              {phase === 'photo' ? (
                <>
                  <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-gris-texte">
                    Votre photo
                  </h3>

                  <p className="mt-4 font-sans text-[13px] font-light leading-relaxed text-gris-texte">
                    De face, en pied ou à mi-corps, sur un fond dégagé : c’est ce qui donne le
                    meilleur résultat. Vos vêtements sont remplacés par les pièces du look — votre
                    visage et le décor ne changent pas.
                  </p>

                  <div className="mt-5">
                    {photo ? (
                      <div className="overflow-hidden border border-gris-bordure bg-gris-clair">
                        <img
                          src={photo}
                          alt="Aperçu de votre photo"
                          className="mx-auto max-h-[340px] w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setPhoto(null)}
                          className="w-full border-t border-gris-bordure bg-blanc-pur py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-gris-texte transition-colors hover:text-noir-encre"
                        >
                          Changer la photo
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gris-bordure bg-gris-clair px-6 py-12 text-center transition-colors hover:border-noir-encre">
                        {/*
                          Un input fichier nu, SANS attribut `capture` — et c'est
                          tout l'enjeu. Sur ordinateur il ouvre l'explorateur de
                          fichiers, rien d'autre. Sur mobile, iOS et Android
                          présentent d'eux-mêmes le choix « Prendre une photo /
                          Photothèque / Parcourir ». Ajouter `capture` forcerait
                          l'appareil photo et supprimerait justement ce choix.
                        */}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={onFichier}
                        />
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-noir-encre text-[18px] text-noir-encre">
                          ↑
                        </span>
                        <span className="mt-3 font-sans text-[14px] font-medium text-noir-encre">
                          Choisir une photo
                        </span>
                        <span className="mt-1 font-sans text-[11px] font-light text-gris-texte">
                          JPG, PNG · Votre photo reste privée
                        </span>
                      </label>
                    )}

                    {erreurPhoto && (
                      <p className="mt-3 font-sans text-[12px] font-light text-rouge-solde">
                        {erreurPhoto}
                      </p>
                    )}

                    {!photo && (
                      <button
                        type="button"
                        onClick={() => void integrer(EXEMPLE_IMAGE)}
                        className="mt-3 w-full text-center font-sans text-[12px] font-light text-gris-texte underline-offset-4 transition-colors hover:text-noir-encre hover:underline"
                      >
                        Pas de photo sous la main ? Essayer sur une silhouette →
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <div className="relative overflow-hidden border border-gris-bordure bg-gris-clair">
                    {statut === 'pending' ? (
                      <div className="flex h-[420px] flex-col items-center justify-center bg-blanc-pur px-6 text-center">
                        <Logo large className="text-noir-encre" />
                        <span className="mt-7 h-7 w-7 animate-spin rounded-full border-2 border-noir-encre/15 border-t-sable" />
                        <p className="mt-4 font-sans text-[11px] font-light uppercase tracking-[0.16em] text-gris-texte">
                          Essayage en cours…
                        </p>
                      </div>
                    ) : visuel ? (
                      <img
                        src={visuel}
                        alt={
                          image
                            ? 'Vous, habillé du look complet'
                            : 'Planche des pièces de votre look'
                        }
                        className="anim-art-reveal mx-auto block max-h-[440px] w-auto max-w-full"
                      />
                    ) : (
                      <div className="flex h-[420px] items-center justify-center">
                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-noir-encre/15 border-t-sable" />
                      </div>
                    )}

                    {statut !== 'pending' && visuel && (
                      <button
                        type="button"
                        onClick={() => void telecharger()}
                        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-noir-encre/70 py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-sm transition-colors hover:bg-noir-encre/85"
                      >
                        <DownloadIcon className="h-4 w-4" />
                        Télécharger
                      </button>
                    )}
                  </div>

                  {statut === 'error' && (
                    <p className="mt-3 font-sans text-[12px] font-light leading-relaxed text-gris-texte">
                      Essayage indisponible — voici la planche de votre look.{' '}
                      <button
                        type="button"
                        onClick={() => void lancerEssayage()}
                        className="text-noir-encre underline underline-offset-2 hover:opacity-60"
                      >
                        Réessayer
                      </button>
                    </p>
                  )}
                  {statut === 'done' && (
                    <p className="mt-3 font-sans text-[11px] font-light italic text-gris-texte">
                      Essayage généré à titre indicatif — les proportions réelles peuvent différer.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Colonne droite : les pièces du look ── */}
            <div className="flex flex-col">
              <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-gris-texte">
                {phase === 'photo' ? 'Pièces à essayer' : 'Les pièces du look'}
              </h3>

              <ul className="mt-4 space-y-3">
                {look.map((article) => {
                  const actif = retenus.has(article.id)
                  const contenu = (
                    <>
                      <span
                        className={`block w-[64px] shrink-0 overflow-hidden bg-gris-clair transition-opacity ${
                          actif ? '' : 'opacity-40'
                        }`}
                      >
                        <span className="block aspect-[3/4]">
                          <VisuelProduit
                            article={article}
                            decoratif
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block font-sans text-[12.5px] font-medium leading-snug ${
                            actif ? 'text-noir-encre' : 'text-gris-texte line-through'
                          }`}
                        >
                          {article.couleur} {article.nom}
                        </span>
                        <span className="mt-0.5 block font-sans text-[12px] font-light text-gris-texte">
                          {formatPrix(article.prix)}
                        </span>
                      </span>
                    </>
                  )

                  if (phase === 'rendu') {
                    return actif ? (
                      <li key={article.id} className="flex items-center gap-3">
                        {contenu}
                      </li>
                    ) : null
                  }

                  return (
                    <li key={article.id}>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={actif}
                          onChange={() => basculerPiece(article.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[12px] transition-colors ${
                            actif
                              ? 'border-noir-encre bg-noir-encre text-white'
                              : 'border-gris-bordure bg-blanc-pur text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        {contenu}
                      </label>
                    </li>
                  )
                })}
              </ul>

            </div>
          </div>
        </div>

        {/* Le total et l'action restent visibles quelle que soit la hauteur de
            fenêtre : c'est le corps qui défile, pas le pied. */}
        <footer className="shrink-0 border-t border-gris-bordure px-6 py-4 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-baseline gap-3">
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-gris-texte">
                {pieces.length} pièce{pieces.length > 1 ? 's' : ''}
              </span>
              <span className="font-serif text-[20px] text-noir-encre">
                {formatPrix(totalTenue(pieces))}
              </span>
            </p>

            <div className="flex gap-3 sm:w-[440px]">
              {phase === 'photo' ? (
                <button
                  type="button"
                  onClick={() => void lancerEssayage()}
                  disabled={!photo}
                  className="btn-dark flex-1 py-4 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-noir-encre"
                >
                  {photo ? 'Lancer l’essayage' : 'Ajoutez d’abord une photo'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={recommencer}
                    disabled={statut === 'pending'}
                    className="btn-outline-dark flex-1 px-3 py-4 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Changer de photo
                  </button>
                  <button type="button" onClick={onFermer} className="btn-dark flex-1 py-4">
                    Fermer
                  </button>
                </>
              )}
            </div>
          </div>

          {phase === 'photo' && (
            <p className="mt-2 font-sans text-[11px] font-light text-gris-texte sm:text-right">
              Votre photo n’est utilisée que pour produire ce rendu.
            </p>
          )}
        </footer>
      </div>
    </>
  )
}
