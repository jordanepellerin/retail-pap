import { useEffect, useRef, useState } from 'react'
import type { Oeuvre, WidgetState } from '../../../types'
import { SELECTION_MAX } from '../../../types'
import type { WidgetDispatch } from '../state'
import { grouperParArtiste } from '../../../data/catalogue'
import { Prompt, Subtext, StepEyebrow, PrimaryButton } from '../ui'

interface StepResultsProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/** Carrousel horizontal des œuvres d'un artiste. Chaque tuile porte le nom sur un bandeau. */
function ArtistCarousel({
  artiste,
  oeuvres,
  raisonsParOeuvre,
  selectedIds,
  atMax,
  onToggle
}: {
  artiste: string
  oeuvres: Oeuvre[]
  raisonsParOeuvre: Record<string, string[]>
  selectedIds: Set<string>
  atMax: boolean
  onToggle: (o: Oeuvre) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const initial = Math.max(
    0,
    oeuvres.findIndex((o) => selectedIds.has(o.id))
  )
  const [idx, setIdx] = useState(0)

  // Au montage, se caler sur l'œuvre déjà sélectionnée (retour depuis le rendu).
  useEffect(() => {
    const el = ref.current
    if (el && initial > 0) {
      requestAnimationFrame(() => {
        el.scrollLeft = initial * el.clientWidth
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }
  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  const multiple = oeuvres.length > 1
  const arrowCls =
    'absolute top-[42%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[20px] text-noir-bartoux shadow-md transition-colors hover:text-or-bartoux sm:flex'

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-xl"
      >
        {oeuvres.map((o) => {
          const isSel = selectedIds.has(o.id)
          // Au plafond, les œuvres non retenues ne sont plus cliquables (mais on
          // peut toujours en retirer une déjà sélectionnée).
          const bloque = atMax && !isSel
          const raisons = (raisonsParOeuvre[o.id] ?? []).slice(0, 2)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={isSel}
              disabled={bloque}
              className={`relative block w-full shrink-0 snap-start text-left ${
                bloque ? 'cursor-not-allowed opacity-45' : ''
              }`}
            >
              {/* Format portrait + object-contain : l'œuvre est montrée en entier, jamais recadrée */}
              <div className="aspect-[3/4] w-full bg-[#0D0D0D]">
                <img src={o.image} alt={o.titre} className="h-full w-full object-contain" />
              </div>
              {/* Badges « pourquoi » issus du matching (max 2, discrets) */}
              {raisons.length > 0 && (
                <div className="absolute left-3 top-3 flex max-w-[80%] flex-wrap gap-1.5">
                  {raisons.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-or-bartoux/50 bg-black/60 px-2.5 py-1 font-sans text-[10px] font-medium text-or-bartoux backdrop-blur-sm"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
              {/* Bandeau givré translucide : le texte ressort quelle que soit l'œuvre */}
              <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-or-bartoux">
                  {artiste}
                </p>
                <p className="mt-0.5 font-serif text-[18px] leading-tight text-white">{o.titre}</p>
                <p className="mt-1 font-sans text-[12px] font-light text-white/80">
                  {o.medium} · {o.dimensions}
                </p>
              </div>
              <span
                className={`pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset transition-colors ${
                  isSel ? 'ring-or-bartoux' : 'ring-transparent'
                }`}
              />
              {/* Pastille d'ajout/retrait : ✓ doré si retenue, + discret sinon */}
              <span
                className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[13px] transition-colors ${
                  isSel
                    ? 'bg-or-bartoux text-noir-bartoux'
                    : 'border border-white/50 bg-black/50 text-white backdrop-blur-sm'
                }`}
                aria-hidden="true"
              >
                {isSel ? '✓' : '+'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Flèches de navigation (desktop) — faciles à cliquer à la souris */}
      {multiple && idx > 0 && (
        <button
          type="button"
          onClick={() => goTo(idx - 1)}
          aria-label={`Œuvre précédente de ${artiste}`}
          className={`${arrowCls} left-3`}
        >
          ‹
        </button>
      )}
      {multiple && idx < oeuvres.length - 1 && (
        <button
          type="button"
          onClick={() => goTo(idx + 1)}
          aria-label={`Œuvre suivante de ${artiste}`}
          className={`${arrowCls} right-3`}
        >
          ›
        </button>
      )}

      {multiple && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {oeuvres.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Voir l'œuvre ${i + 1} de ${artiste}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-5 bg-or-bartoux' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const PAGE = 3 // artistes affichés par bloc

/**
 * Construit les groupes par artiste à afficher.
 * Avec matching : artistes classés par leur meilleure œuvre, œuvres par score,
 * exclusions (type, artiste, taille) déjà retirées. Sans matching (repli) :
 * ordre du catalogue, avec priorité aux artistes cités dans la recherche.
 */
function construireGroupes(state: WidgetState): {
  groupes: { artiste: string; oeuvres: Oeuvre[] }[]
  raisonsParOeuvre: Record<string, string[]>
} {
  const type = state.type ?? 'sculpture'
  const matches = state.matches

  if (matches && matches.length > 0) {
    const raisonsParOeuvre: Record<string, string[]> = {}
    const groupes: { artiste: string; oeuvres: Oeuvre[] }[] = []
    for (const m of matches) {
      raisonsParOeuvre[m.oeuvre.id] = m.raisons
      let groupe = groupes.find((g) => g.artiste === m.oeuvre.artiste)
      if (!groupe) {
        groupe = { artiste: m.oeuvre.artiste, oeuvres: [] }
        groupes.push(groupe) // matches triés par score → l'ordre d'apparition = classement
      }
      groupe.oeuvres.push(m.oeuvre)
    }
    return { groupes, raisonsParOeuvre }
  }

  const all = grouperParArtiste(type)
  const q = state.recherche.trim().toLowerCase()
  const groupes = q
    ? [...all].sort(
        (a, b) =>
          (a.artiste.toLowerCase().includes(q) ? 0 : 1) -
          (b.artiste.toLowerCase().includes(q) ? 0 : 1)
      )
    : all
  return { groupes, raisonsParOeuvre: {} }
}

export default function StepResults({ state, dispatch }: StepResultsProps) {
  const { groupes, raisonsParOeuvre } = construireGroupes(state)
  const selectedIds = new Set(state.selection.map((o) => o.id))
  const count = state.selection.length
  const atMax = count >= SELECTION_MAX

  // Affiche par blocs de 3 ; inclut d'emblée l'artiste d'une œuvre déjà retenue
  // (retour depuis le rendu) pour qu'elle reste visible.
  const repere = state.selected ?? state.selection[0] ?? null
  const selArtIdx = repere
    ? groupes.findIndex((g) => g.oeuvres.some((o) => o.id === repere.id))
    : -1
  const [visible, setVisible] = useState(
    selArtIdx >= 0 ? Math.ceil((selArtIdx + 1) / PAGE) * PAGE : PAGE
  )
  const shown = groupes.slice(0, visible)
  const hasMore = visible < groupes.length

  return (
    <div className="flex min-h-full flex-col px-5 pb-7 pt-5">
      <StepEyebrow>Ma sélection</StepEyebrow>
      <Prompt>Composez votre sélection</Prompt>
      <Subtext>
        Faites glisser pour parcourir les œuvres, puis touchez chaque coup de cœur pour l'ajouter.
        Vous en visualiserez ensuite une chez vous.
      </Subtext>

      <div className="mt-5 space-y-6">
        {shown.map((g) => (
          <ArtistCarousel
            key={g.artiste}
            artiste={g.artiste}
            oeuvres={g.oeuvres}
            raisonsParOeuvre={raisonsParOeuvre}
            selectedIds={selectedIds}
            atMax={atMax}
            onToggle={(o) => dispatch({ type: 'TOGGLE_SELECT', value: o })}
          />
        ))}
      </div>

      <div className="mt-auto space-y-4 pt-6">
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisible((v) => Math.min(v + PAGE, groupes.length))}
            className="w-full text-center font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-or-bartoux underline-offset-4 transition-colors hover:text-white"
          >
            Voir plus de résultats →
          </button>
        )}
        <p className="text-center font-sans text-[11px] font-light tracking-[0.08em] text-gris-texte">
          {count === 0
            ? `Jusqu'à ${SELECTION_MAX} œuvres`
            : atMax
              ? `${count} / ${SELECTION_MAX} œuvres — maximum atteint`
              : `${count} / ${SELECTION_MAX} sélectionnée${count > 1 ? 's' : ''}`}
        </p>
        <PrimaryButton
          onClick={() => dispatch({ type: 'GOTO', step: 'photo' })}
          disabled={count === 0}
        >
          {count > 0 ? `Continuer (${count})` : 'Choisissez au moins une œuvre'}
        </PrimaryButton>
      </div>
    </div>
  )
}
