import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  LIBELLES_CATEGORIE,
  LIBELLES_COUPE,
  declinaisons,
  formatPrix,
  parIdSafe,
  pastilleCouleur,
  sousTitreArticle
} from '../data/catalogue'
import { composerLook } from '../lib/look'
import { totalTenue } from '../lib/tenue'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import VisuelProduit from '../components/VisuelProduit'
import { HangerIcon } from '../components/icons'
import { NOUVEAUTES, REMISES } from '../components/ProductGrid'
import PanneauLook from '../components/look/PanneauLook'
import ModaleEssayage from '../components/look/ModaleEssayage'

/** Bloc dépliable de la colonne produit (taille, entretien, livraison). */
function Accordeon({ titre, children }: { titre: string; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="border-b border-gris-bordure">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between py-4 text-left font-sans text-[13px] text-noir-encre transition-opacity hover:opacity-60"
      >
        {titre}
        <span className="font-sans text-[16px] font-light" aria-hidden="true">
          {ouvert ? '−' : '+'}
        </span>
      </button>
      {ouvert && (
        <div className="pb-4 font-sans text-[13px] font-light leading-relaxed text-gris-texte">
          {children}
        </div>
      )}
    </div>
  )
}

function ArticleIntrouvable() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-content px-4 py-32 text-center sm:px-8">
        <h1 className="font-serif text-[40px] leading-none">Article introuvable</h1>
        <p className="mx-auto mt-5 max-w-[420px] font-sans text-[14px] font-light leading-relaxed text-gris-texte">
          Cette pièce n’est plus au catalogue, ou l’adresse est incomplète.
        </p>
        <Link to="/" className="btn-outline-dark mt-8 inline-flex px-8 py-4">
          Retour à la boutique
        </Link>
      </main>
      <Footer />
    </>
  )
}

/**
 * Fiche produit — grand visuel à gauche, informations à droite, et le look
 * complet accessible depuis le visuel. C'est le point d'entrée demandé : une
 * pièce accompagnée (costume + chemise + chaussures…) doit pouvoir se lire, et
 * s'essayer, comme un tout.
 */
export default function FicheProduit() {
  const { id } = useParams<{ id: string }>()
  const article = id ? parIdSafe(id) : undefined

  const [lookOuvert, setLookOuvert] = useState(false)
  const [essayageOuvert, setEssayageOuvert] = useState(false)
  const [taille, setTaille] = useState<string | null>(null)
  const [noticePanier, setNoticePanier] = useState(false)

  // Changer d'article remet la fiche à zéro — sinon la taille d'un costume
  // resterait sélectionnée sur une paire de chaussures.
  useEffect(() => {
    window.scrollTo(0, 0)
    setLookOuvert(false)
    setEssayageOuvert(false)
    setTaille(null)
    setNoticePanier(false)
  }, [id])

  // Échap ferme la couche du dessus, une seule à la fois : d'abord l'essayage,
  // puis le tiroir du look. Un unique écouteur, tenu par la page — c'est elle
  // qui connaît l'empilement, et deux écouteurs concurrents se marcheraient
  // dessus (celui du dessous ferme sa couche, ce qui re-rend la couche du
  // dessus ; un écouteur réinscrit pendant la propagation ne reçoit plus
  // l'événement en cours).
  useEffect(() => {
    if (!lookOuvert && !essayageOuvert) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (essayageOuvert) setEssayageOuvert(false)
      else setLookOuvert(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lookOuvert, essayageOuvert])

  const look = useMemo(() => (article ? composerLook(article) : []), [article])

  if (!article) return <ArticleIntrouvable />

  const remise = REMISES[article.id]
  const nouveaute = NOUVEAUTES.has(article.id)
  const coloris = declinaisons(article)
  const prixRemise = remise ? Math.round((article.prix * (100 - remise)) / 100) : null
  // Un look d'une seule pièce n'a rien à montrer : le bouton ne s'affiche pas.
  const looksProposes = look.length > 1

  return (
    <>
      <Nav />

      <main className="mx-auto max-w-content px-4 sm:px-8">
        <nav aria-label="Fil d'Ariane" className="py-6 font-sans text-[13px]">
          <Link to="/" className="text-gris-texte transition-colors hover:text-noir-encre">
            Accueil
          </Link>
          <span className="px-2 text-gris-texte" aria-hidden="true">
            /
          </span>
          <Link to="/" className="text-gris-texte transition-colors hover:text-noir-encre">
            {LIBELLES_CATEGORIE[article.categorie].pluriel}
          </Link>
          <span className="px-2 text-gris-texte" aria-hidden="true">
            /
          </span>
          <span className="text-noir-encre">{article.nom}</span>
        </nav>

        <div className="grid gap-10 pb-20 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          {/* ── Visuel ── */}
          {/* Le mannequin porte la TENUE COMPLÈTE — celle-là même que « Acheter
              le look » détaille juste à côté. Sans ça, le visiteur ouvre le
              tiroir et n'y retrouve que le costume : le reste du look contredit
              ce qu'il a sous les yeux. Repli sur la photo de la pièce seule
              quand elle n'a pas de photo de look.

              Le cadre garde le RATIO 3:4 de la photo, jusque sur grand écran.
              Il tenait auparavant toute la hauteur de fenêtre, dans une colonne
              presque carrée : `object-cover` rognait alors le haut et le bas,
              c'est-à-dire la tête et les chaussures — précisément les pièces du
              look qu'on venait d'y mettre. C'est donc la hauteur de fenêtre qui
              plafonne la LARGEUR (largeur = hauteur × 3/4), ce qui garde aussi
              les deux acquis du cadrage précédent : le visuel ne dépasse jamais
              la fenêtre, donc le bouton « Acheter le look », ancré en bas,
              reste au-dessus de la ligne de flottaison, et il tient collé
              pendant que la colonne de droite défile. */}
          <div className="relative mx-auto aspect-[3/4] w-full bg-gris-clair lg:sticky lg:top-[88px] lg:max-w-[calc((100vh-120px)*0.75)] lg:self-start">
            <VisuelProduit
              article={article}
              look={looksProposes}
              loading="eager"
              className="h-full w-full object-cover"
            />

            {remise ? (
              <span className="absolute left-0 top-5 bg-noir-encre px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-white">
                {remise}&nbsp;% de réduction
              </span>
            ) : nouveaute ? (
              <span className="absolute left-0 top-5 bg-noir-encre px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-white">
                Nouveauté
              </span>
            ) : null}

            {/* Ancré au visuel, jamais `fixed` : le lanceur du widget occupe
                déjà le coin inférieur droit de l'écran. */}
            {looksProposes && (
              <button
                type="button"
                onClick={() => setLookOuvert(true)}
                className="absolute bottom-4 right-4 flex items-center gap-2 border border-gris-bordure bg-blanc-pur px-5 py-3 font-sans text-[12px] font-medium text-noir-encre shadow-[0_8px_28px_rgba(0,0,0,0.14)] transition-colors hover:bg-noir-encre hover:text-white"
              >
                <HangerIcon className="h-4 w-4" />
                Acheter le look
              </button>
            )}
          </div>

          {/* ── Informations ── */}
          <div className="lg:pt-4">
            <div className="flex items-start justify-between gap-6">
              <h1 className="font-serif text-[30px] leading-tight text-noir-encre">
                {article.couleur} {article.nom}
              </h1>
              <p className="shrink-0 pt-1.5 font-sans text-[15px]">
                {prixRemise !== null ? (
                  <>
                    <span className="text-rouge-solde">{formatPrix(prixRemise)}</span>
                    <span className="ml-2 text-gris-texte line-through">
                      {formatPrix(article.prix)}
                    </span>
                  </>
                ) : (
                  <span className="text-noir-encre">{formatPrix(article.prix)}</span>
                )}
              </p>
            </div>

            <p className="mt-1.5 font-sans text-[13px] font-light text-gris-texte">
              {sousTitreArticle(article)}
            </p>

            <p className="mt-5 font-sans text-[13.5px] font-light leading-relaxed text-gris-texte">
              {article.descriptionCourte}
            </p>

            {coloris.length > 1 && (
              <div className="mt-7">
                <p className="eyebrow">Coloris</p>
                <div className="mt-3 flex gap-2.5">
                  {coloris.map((c) => (
                    <Link
                      key={c.id}
                      to={`/produit/${c.id}`}
                      title={c.couleur}
                      aria-label={c.couleur}
                      aria-current={c.id === article.id ? 'page' : undefined}
                      className={`h-9 w-9 border transition-colors ${
                        c.id === article.id
                          ? 'border-noir-encre'
                          : 'border-gris-bordure hover:border-noir-encre'
                      }`}
                      style={{ background: pastilleCouleur(c) }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7">
              <p className="eyebrow">Taille</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {article.tailles.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTaille(t)
                      setNoticePanier(false)
                    }}
                    aria-pressed={taille === t}
                    className={`min-w-[56px] border px-4 py-3 font-sans text-[13px] transition-colors ${
                      taille === t
                        ? 'border-noir-encre bg-noir-encre text-white'
                        : 'border-gris-bordure text-noir-encre hover:border-noir-encre'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNoticePanier(true)}
              className="btn-dark mt-7 w-full py-4"
            >
              {taille ? 'Ajouter au panier' : 'Choisir la taille'}
            </button>
            {noticePanier && (
              <p role="status" className="mt-2.5 font-sans text-[12px] font-light text-gris-texte">
                {taille
                  ? 'Panier de démonstration : cette boutique sert de vitrine au conseiller de style.'
                  : 'Sélectionnez d’abord une taille ci-dessus.'}
              </p>
            )}

            {looksProposes && (
              <button
                type="button"
                onClick={() => setLookOuvert(true)}
                className="btn-outline-dark mt-3 w-full py-4"
              >
                Voir le look complet ({look.length} pièces · {formatPrix(totalTenue(look))})
              </button>
            )}

            <div className="mt-9">
              <Accordeon titre="Taille et coupe">
                {article.coupe ? `${LIBELLES_COUPE[article.coupe]}. ` : ''}
                Tailles disponibles : {article.tailles.join(', ')}. Le mannequin mesure 1,86 m et
                porte la taille {article.tailles[Math.floor(article.tailles.length / 2)]}.
              </Accordeon>
              <Accordeon titre="Détails et entretien">
                {article.matiere}. Nettoyage à sec recommandé. Dessiné à Paris, fabriqué en Europe.
              </Accordeon>
              <Accordeon titre="Livraison et retours">
                Livraison offerte en 2 à 4 jours ouvrables. Retours gratuits sous 30 jours.
              </Accordeon>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {lookOuvert && (
        <PanneauLook
          look={look}
          onFermer={() => setLookOuvert(false)}
          onEssayer={() => setEssayageOuvert(true)}
        />
      )}

      {essayageOuvert && (
        <ModaleEssayage look={look} onFermer={() => setEssayageOuvert(false)} />
      )}
    </>
  )
}
