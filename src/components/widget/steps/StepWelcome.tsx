import type { WidgetDispatch } from '../state'
import { StepEyebrow, PrimaryButton, SecondaryButton } from '../ui'

interface StepWelcomeProps {
  dispatch: WidgetDispatch
  onBrowse: () => void
}

export default function StepWelcome({ dispatch, onBrowse }: StepWelcomeProps) {
  return (
    <div className="flex min-h-full flex-col p-6">
      {/* Accueil éditorial — registre boutique, pas de bulles de chat */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="mb-6 text-[22px] text-bordeaux" aria-hidden="true">
          ✦
        </span>
        <StepEyebrow>Votre conseiller</StepEyebrow>
        <h2 className="mt-1 max-w-[300px] font-serif text-[30px] font-medium leading-[1.15] text-encre">
          Composons votre tenue
        </h2>
        <p className="mt-5 max-w-[320px] font-sans text-[14px] font-light leading-[1.7] text-ardoise">
          Dites-moi ce que vous cherchez et pour quelle occasion. Je vous propose les pièces qui
          conviennent — et je vous les fais essayer sur votre photo.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'request' })}>
          Commencer
        </PrimaryButton>
        <SecondaryButton onClick={onBrowse}>Parcourir la boutique →</SecondaryButton>
      </div>
    </div>
  )
}
