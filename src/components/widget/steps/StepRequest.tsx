import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton } from '../ui'
import { DEMANDE_MAX } from '../../../types/ai'

interface StepRequestProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/**
 * Amorces de demande. Elles ne sont pas décoratives : chacune est rédigée pour
 * être lue par `detecterIntention` (famille + occasion + matière), donc un clic
 * suffit à sauter une ou deux questions de qualification.
 */
const SUGGESTIONS = [
  'Un costume pour un mariage en extérieur',
  'Une veste pour le bureau',
  'Un smoking pour une soirée de gala',
  'Une chemise en lin pour l’été',
  'Des chaussures habillées en cuir brun',
  'Une tenue complète, je pars de zéro'
]

export default function StepRequest({ state, dispatch }: StepRequestProps) {
  const demande = state.demande

  const choisir = (texte: string) => {
    dispatch({ type: 'SET_DEMANDE', value: texte })
    dispatch({ type: 'RESET_QUALIFICATION' })
    dispatch({ type: 'GOTO', step: 'qualify' })
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>Votre recherche</StepEyebrow>
      <Prompt>Que recherchez-vous aujourd’hui&nbsp;?</Prompt>
      <Subtext>
        Écrivez-le comme vous le diriez en boutique — occasion, matière, couleur, budget. Plus
        c’est précis, moins j’ai de questions à vous poser.
      </Subtext>

      <div className="mt-5">
        <textarea
          className="field-area"
          rows={3}
          maxLength={DEMANDE_MAX}
          placeholder="Ex. Un costume en lin clair pour un mariage en juin, autour de 700 €"
          value={demande}
          onChange={(e) => dispatch({ type: 'SET_DEMANDE', value: e.target.value })}
        />
      </div>

      <div className="mt-5">
        <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ardoise">
          Ou partez d’une idée
        </p>
        <div className="space-y-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => choisir(s)}
              className="chip flex items-center justify-between gap-3"
            >
              {s}
              <span className="shrink-0 text-bordeaux" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <PrimaryButton
          onClick={() => dispatch({ type: 'GOTO', step: 'qualify' })}
          disabled={demande.trim().length === 0}
        >
          {demande.trim().length === 0 ? 'Décrivez votre recherche' : 'Continuer'}
        </PrimaryButton>
      </div>
    </div>
  )
}
