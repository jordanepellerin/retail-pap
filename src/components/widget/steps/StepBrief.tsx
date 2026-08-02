import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, StepEyebrow, PrimaryButton, SecondaryButton, Avatar } from '../ui'
import { intentionCourante } from '../../../lib/intent'
import { briefCode, criteres, retirerCritere } from '../../../lib/brief'
import { classerArticles } from '../../../lib/matching'

interface StepBriefProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/**
 * Le moment où le visiteur vérifie qu'on l'a compris. La reformulation vient de
 * l'IA quand elle est disponible, sinon du code (`briefCode`) : cet écran ne
 * doit jamais être vide, c'est lui qui porte la confiance du parcours.
 *
 * Chaque critère est retirable d'un geste — c'est plus rapide que de refaire
 * tout le questionnaire quand une seule chose a été mal comprise.
 */
export default function StepBrief({ state, dispatch }: StepBriefProps) {
  const intention = intentionCourante(state)
  const repli = briefCode(intention, state.demande)
  const reformulation = state.brief.result?.reformulation?.trim() || repli.reformulation
  const conseil = state.brief.result?.conseil?.trim() || repli.conseil
  const liste = criteres(intention)

  const retirer = (index: number) => {
    const nouvelle = retirerCritere(intention, liste[index])
    dispatch({ type: 'AFFINER_INTENTION', value: nouvelle })
    // Le classement se refait immédiatement : l'écran suivant est déjà à jour.
    dispatch({ type: 'SET_MATCHES', value: classerArticles(nouvelle) })
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-7 pt-5">
      <StepEyebrow>Si j’ai bien compris</StepEyebrow>

      <div className="flex items-start gap-3">
        <Avatar />
        <div className="min-w-0 flex-1">
          <Prompt>{reformulation}</Prompt>
          {conseil && (
            <p className="anim-bubble mt-3 border-l-2 border-bordeaux/60 pl-3 font-sans text-[13px] font-light leading-relaxed text-ardoise">
              {conseil}
            </p>
          )}
        </div>
      </div>

      {liste.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ardoise">
            Ce que je retiens
          </p>
          <div className="flex flex-wrap gap-2">
            {liste.map((c, i) => (
              <span
                key={`${c.champ}-${c.valeur}`}
                className="inline-flex items-center gap-2 border border-bordeaux/40 bg-bordeaux/[0.08] py-1.5 pl-3 pr-1.5 font-sans text-[12px] text-encre"
              >
                {c.label}
                <button
                  type="button"
                  onClick={() => retirer(i)}
                  aria-label={`Retirer le critère ${c.label}`}
                  className="flex h-5 w-5 items-center justify-center text-bordeaux transition-colors hover:bg-bordeaux hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'selection' })}>
          C’est exactement ça
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            dispatch({ type: 'RESET_QUALIFICATION' })
            dispatch({ type: 'GOTO', step: 'qualify' })
          }}
        >
          Reprendre les questions
        </SecondaryButton>
      </div>
    </div>
  )
}
