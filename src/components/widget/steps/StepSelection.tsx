import { useEffect, useMemo, useRef, useState } from 'react'
import type { Article, Categorie, WidgetState } from '../../../types'
import type { MatchResult } from '../../../types/ai'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton, SecondaryButton, VignetteArticle } from '../ui'
import { LIBELLES_CATEGORIE, ORDRE_CATEGORIES, formatPrix } from '../../../data/catalogue'
import VisuelProduit from '../../VisuelProduit'
import ModaleFamilles from '../ModaleFamilles'
import { intentionCourante } from '../../../lib/intent'
import { briefCode, criteres } from '../../../lib/brief'
import { categoriesDemandees, classerArticles, prioriserAccords } from '../../../lib/matching'
import { noticeRemplacement } from '../../../lib/tenue'

interface StepSelectionProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/** Carrousel horizontal d'une famille de produits. Une tuile = un article. */
function CarrouselCategorie({
  categorie,
  matches,
  retenus,
  onToggle
}: {
  categorie: Categorie
  matches: MatchResult[]
  retenus: Set<string>
  onToggle: (a: Article) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }
  const allerA = (i: number) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  const multiple = matches.length > 1
  const flecheCls =
    'absolute top-[40%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center border border-gris-bordure bg-blanc-pur text-[20px] text-noir-encre shadow-md transition-colors hover:bg-gris-clair sm:flex'

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-gris-texte">
          {LIBELLES_CATEGORIE[categorie].pluriel}
        </h3>
        <span className="font-sans text-[11px] font-light text-gris-texte">
          {matches.length} pièce{matches.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative">
        <div
          ref={ref}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {matches.map(({ article }) => {
            const actif = retenus.has(article.id)
            return (
              <button
                key={article.id}
                type="button"
                onClick={() => onToggle(article)}
                aria-pressed={actif}
                className="relative block w-full shrink-0 snap-start text-left"
              >
                {/* object-contain : la pièce est montrée en entier, jamais recadrée */}
                <div
                  className="aspect-[3/4] w-full bg-gris-clair"
                >
                  <VisuelProduit
                    article={article}
                    alt={article.nom}
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Aucune étiquette par-dessus le visuel : la photo produit se
                    suffit. Le scoring continue de produire `raisons`, il n'est
                    simplement plus affiché ici. */}

                <div className="absolute inset-x-0 bottom-0 border-t border-gris-bordure bg-blanc-pur/95 px-4 py-3 backdrop-blur-md">
                  <p className="font-serif text-[17px] leading-tight text-noir-encre">{article.nom}</p>
                  <p className="mt-1 font-sans text-[12px] font-light text-gris-texte">
                    {article.couleur} · {article.matiere}
                  </p>
                  <p className="mt-1 font-sans text-[13px] text-noir-encre">{formatPrix(article.prix)}</p>
                </div>

                <span
                  className={`pointer-events-none absolute inset-0 ring-2 ring-inset transition-colors ${
                    actif ? 'ring-noir-encre' : 'ring-transparent'
                  }`}
                />
                <span
                  className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-[14px] transition-colors ${
                    actif
                      ? 'bg-noir-encre text-white'
                      : 'border border-gris-bordure bg-blanc-pur/90 text-noir-encre'
                  }`}
                  aria-hidden="true"
                >
                  {actif ? '✓' : '+'}
                </span>
              </button>
            )
          })}
        </div>

        {multiple && idx > 0 && (
          <button
            type="button"
            onClick={() => allerA(idx - 1)}
            aria-label={`Pièce précédente — ${LIBELLES_CATEGORIE[categorie].pluriel}`}
            className={`${flecheCls} left-3`}
          >
            ‹
          </button>
        )}
        {multiple && idx < matches.length - 1 && (
          <button
            type="button"
            onClick={() => allerA(idx + 1)}
            aria-label={`Pièce suivante — ${LIBELLES_CATEGORIE[categorie].pluriel}`}
            className={`${flecheCls} right-3`}
          >
            ›
          </button>
        )}

        {multiple && (
          <div className="mt-2.5 flex justify-center gap-1.5">
            {matches.map(({ article }, i) => (
              <button
                key={article.id}
                type="button"
                onClick={() => allerA(i)}
                aria-label={`Voir la pièce ${i + 1}`}
                className={`h-1.5 transition-all ${
                  i === idx ? 'w-5 bg-noir-encre' : 'w-1.5 bg-gris-bordure hover:bg-gris-texte/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const PAR_PAGE = 3 // familles affichées par bloc
// Côté de la vignette dans la bande de tenue. La tuile « + » s'aligne dessus :
// une seule valeur pour que les deux ne dérivent jamais l'une de l'autre.
const COTE_VIGNETTE = 48

export default function StepSelection({ state, dispatch }: StepSelectionProps) {
  const intention = intentionCourante(state)
  const phase = state.phase
  const [visible, setVisible] = useState(PAR_PAGE)
  const [dernierAjout, setDernierAjout] = useState<Article | null>(null)
  const [famillesAjoutees, setFamillesAjoutees] = useState<Categorie[]>([])
  const [choixOuvert, setChoixOuvert] = useState(false)

  /**
   * Familles affichées.
   *
   * Phase `demande` : celles que le visiteur a demandées, montrées d'office.
   * Phase `complements` : RIEN au départ. Cet écran ne propose plus de familles
   * de sa propre initiative — le visiteur les fait apparaître une par une
   * depuis « Ajouter une famille », dans l'ordre où il les choisit.
   */
  const famillesBase = useMemo(
    () => (phase === 'demande' ? categoriesDemandees(intention) : []),
    // `state.tenue` ne doit pas réordonner les familles sous le doigt du
    // visiteur : on ne recalcule qu'au changement de phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase]
  )

  const familles = useMemo(
    () => [...famillesBase, ...famillesAjoutees.filter((c) => !famillesBase.includes(c))],
    [famillesBase, famillesAjoutees]
  )

  const parFamille = useMemo(() => {
    if (phase === 'demande' && state.matches) {
      return familles.map((c) => ({
        categorie: c,
        matches: state.matches!.filter((m) => m.article.categorie === c)
      }))
    }
    // Complément : le budget annoncé portait sur la pièce principale, il ne doit
    // pas masquer une ceinture ou une cravate — on le neutralise ici.
    const base = phase === 'complements' ? { ...intention, budgetMax: null } : intention
    return familles.map((c) => ({
      categorie: c,
      matches: prioriserAccords(classerArticles(base, [c]), state.tenue)
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, familles, state.matches])

  const retenus = new Set(state.tenue.map((a) => a.id))
  const nb = state.tenue.length
  const nonVides = parFamille.filter((g) => g.matches.length > 0)
  // Le plafond d'affichage ne vaut que pour la phase `demande`, où les familles
  // arrivent d'office. En complément, chacune a été demandée explicitement :
  // en cacher une derrière un « voir plus » serait ignorer le geste du visiteur.
  const affichees = phase === 'demande' ? nonVides.slice(0, visible) : nonVides
  const restantes = phase === 'demande' ? nonVides.length - affichees.length : 0

  const notice = dernierAjout ? noticeRemplacement(dernierAjout, state.derniersRetires) : null

  // La notice de remplacement s'efface d'elle-même : elle informe, elle ne
  // demande rien.
  useEffect(() => {
    if (state.derniersRetires.length === 0) return
    const t = setTimeout(() => dispatch({ type: 'EFFACER_NOTICE' }), 6000)
    return () => clearTimeout(t)
  }, [state.derniersRetires, dispatch])

  const basculer = (article: Article) => {
    setDernierAjout(article)
    dispatch({ type: 'TOGGLE_ARTICLE', value: article })
  }

  const passerAuxComplements = () => {
    setVisible(PAR_PAGE)
    dispatch({ type: 'SET_PHASE', value: 'complements' })
  }

  /**
   * Familles encore proposables : toutes CELLES QUE LE VISITEUR NE PORTE PAS
   * déjà — une chemise retenue retire « Chemises » de la liste. Les familles
   * déjà à l'écran y restent volontairement : au-delà du plafond d'affichage,
   * c'est par là qu'on les fait apparaître, et les redemander est sans effet
   * de bord. Une famille sans pièce disponible n'est pas proposée.
   */
  const famillesProposables = useMemo(() => {
    const portees = new Set(state.tenue.map((a) => a.categorie))
    const sansBudget = { ...intention, budgetMax: null }
    return ORDRE_CATEGORIES.filter((c) => !portees.has(c))
      .map((categorie) => ({
        categorie,
        disponibles: classerArticles(sansBudget, [categorie]).length
      }))
      .filter((f) => f.disponibles > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tenue])

  // La tuile « + » vit dans la bande de tenue : elle doit donc rester affichable
  // même si le visiteur retire toutes ses pièces en phase complément, sinon la
  // bande disparaît et emporte le seul accès aux familles.
  const peutAjouterFamille = phase === 'complements' && famillesProposables.length > 0

  const ajouterFamilles = (choisies: Categorie[]) => {
    setFamillesAjoutees((precedent) => [
      ...precedent,
      ...choisies.filter((c) => !precedent.includes(c))
    ])
    setChoixOuvert(false)
  }

  // Retour à la demande, texte conservé pour être retouché. Le classement et la
  // reformulation sont invalidés par le prochain SET_DEMANDE : relancer produit
  // bien un cycle neuf, pas un affichage périmé.
  const modifierLaDemande = () => {
    setVisible(PAR_PAGE)
    dispatch({ type: 'SET_PHASE', value: 'demande' })
    dispatch({ type: 'GOTO', step: 'request' })
  }

  // Reformulation IA quand elle a abouti, repli 100 % code sinon : cette ligne
  // ne doit jamais être vide, c'est elle qui porte la confiance du parcours.
  const repli = briefCode(intention, state.demande)
  const reformulation = state.brief.result?.reformulation?.trim() || repli.reformulation
  const criteresLus = criteres(intention)

  return (
    <div className="flex min-h-full flex-col px-5 pb-7 pt-5">
      {phase === 'demande' ? (
        <>
          <StepEyebrow>Votre demande</StepEyebrow>
          <Prompt>Voici ce que je vous propose</Prompt>
          {/* La reformulation tenait un écran à elle seule ; elle tient
              maintenant en tête des résultats — le visiteur vérifie qu'on l'a
              compris sans qu'un clic de plus le sépare de sa sélection. */}
          <p className="anim-bubble mt-3 border-l-2 border-sable pl-3 font-sans text-[13px] font-light leading-relaxed text-gris-texte">
            {reformulation}
          </p>
          {criteresLus.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {criteresLus.map((c) => (
                <span
                  key={`${c.champ}-${c.valeur}`}
                  className="border border-gris-bordure bg-gris-clair px-2.5 py-1 font-sans text-[11px] text-noir-encre"
                >
                  {c.label}
                </span>
              ))}
            </div>
          )}
          <Subtext>
            Faites glisser pour parcourir, touchez une pièce pour la retenir. Vous ne pouvez garder
            qu’une pièce par emplacement — la nouvelle remplace l’ancienne.
          </Subtext>
        </>
      ) : (
        <>
          <StepEyebrow>Complétez la tenue</StepEyebrow>
          <Prompt>Souhaitez-vous compléter votre tenue&nbsp;?</Prompt>
          <Subtext>
            Choisissez les familles que vous voulez voir. Les pièces proposées s’accorderont à ce
            que vous avez retenu. Rien n’est obligatoire.
          </Subtext>
        </>
      )}

      {/* Bande de la tenue en cours — visible dès qu'une pièce est retenue. La
          tuile « + » y tient sa place, à la suite des pièces : même ligne, même
          hauteur, et le libellé tombe (le signe se suffit à lui-même). */}
      {(nb > 0 || peutAjouterFamille) && (
        <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {state.tenue.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => dispatch({ type: 'RETIRER_ARTICLE', id: a.id })}
              aria-label={`Retirer ${a.nom} de la tenue`}
              className="group relative shrink-0"
            >
              <VignetteArticle article={a} taille={COTE_VIGNETTE} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-noir-encre text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                ×
              </span>
            </button>
          ))}

          {peutAjouterFamille && (
            <button
              type="button"
              onClick={() => setChoixOuvert(true)}
              aria-label="Ajouter une famille"
              title="Ajouter une famille"
              className="flex shrink-0 items-center justify-center border border-gris-bordure text-[22px] leading-none text-noir-encre transition-colors duration-200 hover:border-noir-encre hover:bg-gris-clair"
              style={{ width: COTE_VIGNETTE, height: COTE_VIGNETTE * 1.25 }}
            >
              <span aria-hidden="true">+</span>
            </button>
          )}
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="anim-bubble mt-3 border-l-2 border-sable bg-gris-clair px-3 py-2 font-sans text-[12px] font-light leading-relaxed text-noir-encre"
        >
          {notice}
        </p>
      )}

      <div className="mt-5 space-y-7">
        {affichees.map((g) => (
          <CarrouselCategorie
            key={g.categorie}
            categorie={g.categorie}
            matches={g.matches}
            retenus={retenus}
            onToggle={basculer}
          />
        ))}
        {affichees.length === 0 &&
          (phase === 'complements' ? (
            <p className="border border-dashed border-gris-bordure px-4 py-6 text-center font-sans text-[13px] font-light leading-relaxed text-gris-texte">
              Aucune famille ouverte pour l’instant. Touchez le «&nbsp;+&nbsp;» ci-dessus pour
              choisir ce que vous voulez voir — ou continuez avec votre tenue telle quelle.
            </p>
          ) : (
            <p className="font-sans text-[13px] font-light leading-relaxed text-gris-texte">
              Aucune pièce ne correspond à tous vos critères. Revenez en arrière pour en assouplir
              un.
            </p>
          ))}
      </div>

      <div className="mt-auto space-y-4 pt-7">
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAR_PAGE)}
            className="w-full text-center font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-gris-texte transition-colors hover:text-noir-encre"
          >
            Voir {restantes} famille{restantes > 1 ? 's' : ''} de plus →
          </button>
        )}

        {phase === 'demande' ? (
          <>
            <PrimaryButton onClick={passerAuxComplements} disabled={nb === 0}>
              {nb === 0 ? 'Retenez au moins une pièce' : `Continuer (${nb})`}
            </PrimaryButton>
            {nb > 0 && (
              <SecondaryButton onClick={() => dispatch({ type: 'GOTO', step: 'photo' })}>
                Passer directement à l’essayage →
              </SecondaryButton>
            )}
          </>
        ) : (
          <>
            <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'photo' })}>
              {nb > 0 ? `Voir ma tenue (${nb})` : 'Continuer'}
            </PrimaryButton>
            <SecondaryButton onClick={() => dispatch({ type: 'SET_PHASE', value: 'demande' })}>
              ← Revenir aux pièces demandées
            </SecondaryButton>
          </>
        )}

        {/* Sortie de secours du parcours : rien ne convient, on repart de la
            demande elle-même plutôt que d'insister sur cette sélection. */}
        <div className="border-t border-gris-bordure pt-4">
          <button
            type="button"
            onClick={modifierLaDemande}
            className="w-full text-center font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-gris-texte transition-colors hover:text-noir-encre"
          >
            ↺ Modifier ma demande
          </button>
          <p className="mt-1.5 text-center font-sans text-[11px] font-light text-gris-texte">
            Vous retrouverez votre texte, à retoucher avant de relancer.
          </p>
        </div>
      </div>

      {choixOuvert && (
        <ModaleFamilles
          familles={famillesProposables}
          onAjouter={ajouterFamilles}
          onFermer={() => setChoixOuvert(false)}
        />
      )}
    </div>
  )
}
