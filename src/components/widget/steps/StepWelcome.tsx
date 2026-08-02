import type { WidgetDispatch } from '../state'
import { StepEyebrow, PrimaryButton, SecondaryButton } from '../ui'

interface StepWelcomeProps {
  dispatch: WidgetDispatch
  onBrowse: () => void
}

export default function StepWelcome({ dispatch, onBrowse }: StepWelcomeProps) {
  return (
    <div className="flex min-h-full flex-col p-6">
      {/* Accueil éditorial — registre galerie, pas de bulles de chat */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="mb-6 text-[22px] text-or-bartoux" aria-hidden="true">
          ✦
        </span>
        <StepEyebrow>Conseiller d'art</StepEyebrow>
        <h2 className="mt-1 max-w-[300px] font-serif text-[30px] font-medium leading-[1.15] text-white">
          Explorez les œuvres de nos galeries
        </h2>
        <p className="mt-5 max-w-[320px] font-sans text-[14px] font-light leading-[1.7] text-gris-texte">
          Sculptures, peintures et grands maîtres. Je vous aide à trouver la pièce qui vous
          ressemble — et à la visualiser chez vous, en quelques instants.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'type' })}>
          Commencer l'exploration
        </PrimaryButton>
        <SecondaryButton onClick={onBrowse}>Parcourir le catalogue →</SecondaryButton>
      </div>
    </div>
  )
}
