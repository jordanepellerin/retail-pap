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
import {
  categoriesComplementaires,
  categoriesDemandees,
  classerArticles,
  prioriserAccords
} from '../../../lib/matching'
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
    'absolute top-[40%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center bg-white/90 text-[20px] text-noir-encre shadow-md transition-colors hover:text-sable sm:flex'

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-sable">
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
          {matches.map(({ article, raisons }) => {
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
                  className="aspect-[3/4] w-full"
                  style={{ background: 'linear-gradient(180deg,#141414,#0D0D0D)' }}
                >
                  <VisuelProduit
                    article={article}
                    alt={article.nom}
                    className="h-full w-full object-contain"
                  />
                </div>

                {raisons.length > 0 && (
                  <div className="absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-1.5">
                    {raisons.slice(0, 2).map((r) => (
                      <span
                        key={r}
                        className="border border-sable/60 bg-noir-encre/90 px-2.5 py-1 font-sans text-[10px] font-medium text-sable"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-noir-encre/90 px-4 py-3 backdrop-blur-md">
                  <p className="font-serif text-[17px] leading-tight text-white">{article.nom}</p>
                  <p className="mt-1 font-sans text-[12px] font-light text-white/75">
                    {article.couleur} · {article.matiere}
                  </p>
                  <p className="mt-1 font-sans text-[13px] text-sable">{formatPrix(article.prix)}</p>
                </div>

                <span
                  className={`pointer-events-none absolute inset-0 ring-2 ring-inset transition-colors ${
                    actif ? 'ring-sable' : 'ring-transparent'
                  }`}
                />
                <span
                  className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-[14px] transition-colors ${
                    actif
                      ? 'bg-sable text-noir-encre'
                      : 'border border-white/60 bg-noir-encre/80 text-white'
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
                  i === idx ? 'w-5 bg-sable' : 'w-1.5 bg-white/30 hover:bg-white/50'
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

export default function StepSelection({ state, dispatch }: StepSelectionProps) {
  const intention = intentionCourante(state)
  const phase = state.phase
  const [visible, setVisible] = useState(PAR_PAGE)
  const [dernierAjout, setDernierAjout] = useState<Article | null>(null)
  const [famillesAjoutees, setFamillesAjoutees] = useState<Categorie[]>([])
  const [choixOuvert, setChoixOuvert] = useState(false)

  const famillesBase = useMemo(
    () =>
      phase === 'demande'
        ? categoriesDemandees(intention)
        : categoriesComplementaires(intention, state.tenue),
    // `state.tenue` ne doit pas réordonner les familles sous le doigt du
    // visiteur : on ne recalcule qu'au changement de phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase]
  )

  // Les familles demandées explicitement viennent après les suggestions, dans
  // l'ordre où le visiteur les a choisies.
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
  const affichees = parFamille.filter((g) => g.matches.length > 0).slice(0, visible)
  const restantes = parFamille.filter((g) => g.matches.length > 0).length - affichees.length

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

  const ajouterFamilles = (choisies: Categorie[]) => {
    setFamillesAjoutees((precedent) => [
      ...precedent,
      ...choisies.filter((c) => !precedent.includes(c))
    ])
    // Sans cela, les familles ajoutées tomberaient sous le plafond d'affichage
    // et le visiteur ne verrait rien se passer.
    setVisible((v) => v + choisies.length)
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
          <p className="anim-bubble mt-3 border-l-2 border-sable/60 pl-3 font-sans text-[13px] font-light leading-relaxed text-white/80">
            {reformulation}
          </p>
          {criteresLus.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {criteresLus.map((c) => (
                <span
                  key={`${c.champ}-${c.valeur}`}
                  className="border border-sable/40 bg-sable/[0.08] px-2.5 py-1 font-sans text-[11px] text-white/90"
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
            Ces pièces s’accordent à ce que vous venez de choisir. Rien n’est obligatoire.
          </Subtext>

          {famillesProposables.length > 0 && (
            <button
              type="button"
              onClick={() => setChoixOuvert(true)}
              className="mt-4 flex items-center gap-3 self-start border border-white/25 py-2 pl-2 pr-4 transition-all duration-200 hover:border-sable hover:bg-sable/10"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center border border-sable/50 text-[18px] leading-none text-sable"
              >
                +
              </span>
              <span className="font-sans text-[13px] text-white">Ajouter une famille</span>
            </button>
          )}
        </>
      )}

      {/* Bande de la tenue en cours — visible dès qu'une pièce est retenue */}
      {nb > 0 && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {state.tenue.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => dispatch({ type: 'RETIRER_ARTICLE', id: a.id })}
              aria-label={`Retirer ${a.nom} de la tenue`}
              className="group relative shrink-0"
            >
              <VignetteArticle article={a} taille={48} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-noir-encre text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="anim-bubble mt-3 border-l-2 border-sable bg-sable/[0.08] px-3 py-2 font-sans text-[12px] font-light leading-relaxed text-white/85"
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
        {affichees.length === 0 && (
          <p className="font-sans text-[13px] font-light leading-relaxed text-gris-texte">
            Aucune pièce ne correspond à tous vos critères. Revenez en arrière pour en assouplir un.
          </p>
        )}
      </div>

      <div className="mt-auto space-y-4 pt-7">
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAR_PAGE)}
            className="w-full text-center font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-sable transition-colors hover:text-white"
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
        <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={modifierLaDemande}
            className="w-full text-center font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-gris-texte transition-colors hover:text-white"
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
