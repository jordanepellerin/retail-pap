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
 * suffit à obtenir une demande complète et immédiatement exploitable.
 */
const SUGGESTIONS = [
  'Un costume en laine bleu marine pour un mariage en extérieur',
  'Une veste en tweed pour le bureau, autour de 500 €',
  'Un smoking noir pour une soirée de gala',
  'Une chemise en lin blanche pour l’été',
  'Des chaussures habillées en cuir brun',
  'Une tenue complète pour une cérémonie, je pars de zéro'
]

/**
 * Seule étape de saisie du parcours : la demande libre, et des amorces qui
 * REMPLISSENT le champ au lieu de valider. Le visiteur part d'une phrase déjà
 * écrite, la retouche à sa main, ou en essaie une autre — chaque clic remplace
 * intégralement le contenu du champ. Rien n'avance sans un geste explicite.
 */
export default function StepRequest({ state, dispatch }: StepRequestProps) {
  const demande = state.demande
  const vide = demande.trim().length === 0

  const lancer = () => {
    if (vide) return
    dispatch({ type: 'GOTO', step: 'matching' })
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>Votre recherche</StepEyebrow>
      <Prompt>Que recherchez-vous aujourd’hui&nbsp;?</Prompt>
      <Subtext>
        Écrivez-le comme vous le diriez en boutique — occasion, matière, couleur, budget. Plus
        c’est précis, plus ma sélection est juste.
      </Subtext>

      <div className="mt-5">
        <textarea
          className="field-area"
          rows={4}
          maxLength={DEMANDE_MAX}
          placeholder="Ex. Un costume en lin clair pour un mariage en juin, autour de 700 €"
          value={demande}
          onChange={(e) => dispatch({ type: 'SET_DEMANDE', value: e.target.value })}
        />
        <div className="mt-1.5 flex items-center justify-between">
          {demande.length > 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_DEMANDE', value: '' })}
              className="font-sans text-[11px] font-light text-gris-texte transition-colors hover:text-white"
            >
              Effacer
            </button>
          ) : (
            <span />
          )}
          <span className="font-sans text-[10px] font-light tabular-nums text-gris-texte">
            {demande.length} / {DEMANDE_MAX}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-gris-texte">
          Ou partez d’une idée
        </p>
        <div className="space-y-2">
          {SUGGESTIONS.map((s) => {
            const actif = demande.trim() === s
            return (
              <button
                key={s}
                type="button"
                aria-pressed={actif}
                onClick={() => dispatch({ type: 'SET_DEMANDE', value: s })}
                className={`chip flex items-center justify-between gap-3 ${actif ? 'chip-active' : ''}`}
              >
                {s}
                <span className="shrink-0 text-sable" aria-hidden="true">
                  {actif ? '✓' : '↓'}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2.5 font-sans text-[11px] font-light leading-relaxed text-gris-texte">
          Une idée remplit le champ ci-dessus — à vous de la retoucher avant de lancer.
        </p>
      </div>

      <div className="mt-auto pt-6">
        <PrimaryButton onClick={lancer} disabled={vide}>
          {vide ? 'Décrivez votre recherche' : 'Voir ma sélection'}
        </PrimaryButton>
      </div>
    </div>
  )
}
