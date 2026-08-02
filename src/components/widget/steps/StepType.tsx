import type { Tag, WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton } from '../ui'
import { parId } from '../../../data/catalogue'

// L'image est intégrée au bouton : une œuvre du catalogue illustre chaque univers.
const FONDS: Record<Tag, { image: string; alt: string }> = {
  sculpture: { image: parId('s1').image, alt: 'Sculpture — Bruno Catalano, Cristian' },
  peinture: { image: parId('p7').image, alt: 'Peinture — Kiko, Fusion' }
}

interface StepTypeProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

export default function StepType({ state, dispatch }: StepTypeProps) {
  const type: Tag = state.type ?? 'sculpture'

  const CarteType = ({ value, label }: { value: Tag; label: string }) => {
    const active = type === value
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_TYPE', value })}
        aria-pressed={active}
        className={`group relative aspect-[3/4] overflow-hidden rounded-xl text-left transition-all duration-200 ${
          active ? 'ring-2 ring-or-bartoux' : 'ring-1 ring-white/10 hover:ring-or-bartoux/60'
        }`}
      >
        <img
          src={FONDS[value].image}
          alt={FONDS[value].alt}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${
            active ? 'scale-[1.03]' : 'opacity-80 group-hover:opacity-100'
          }`}
        />
        {/* Bandeau : l'intitulé reste lisible par-dessus l'image */}
        <span
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.14em] backdrop-blur-sm transition-colors duration-200 ${
            active ? 'bg-or-bartoux/95 text-noir-bartoux' : 'bg-black/60 text-white'
          }`}
        >
          {label}
          {active && <span aria-hidden="true">✓</span>}
        </span>
      </button>
    )
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>Type d'œuvre</StepEyebrow>
      <Prompt>Que souhaitez-vous accueillir chez vous ?</Prompt>
      <Subtext>Touchez l'univers qui vous attire — vous pourrez toujours changer d'avis.</Subtext>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CarteType value="sculpture" label="Sculpture" />
        <CarteType value="peinture" label="Peinture" />
      </div>

      {/* Précision libre de la recherche (facultatif) */}
      <div className="mt-4">
        <p className="mb-2 font-sans text-[12px] font-light text-gris-texte">
          Un artiste ou une œuvre en tête ?
        </p>
        <textarea
          className="field-area"
          rows={2}
          maxLength={300}
          placeholder="Ex. Bruno Catalano, une grande pièce colorée… (facultatif)"
          value={state.recherche}
          onChange={(e) => dispatch({ type: 'SET_RECHERCHE', value: e.target.value })}
        />
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'matching' })}>
          Continuer
        </PrimaryButton>
      </div>
    </div>
  )
}
