import { useMemo, useState } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton, SecondaryButton, Chip, Avatar } from '../ui'
import { detecterIntention } from '../../../lib/intent'
import { libelleOption, questionsPour, type Question } from '../../../data/questions'

interface StepQualifyProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/** Une réponse déjà donnée, cliquable pour revenir dessus. */
function EchangePasse({
  question,
  valeurs,
  onModifier
}: {
  question: Question
  valeurs: string[]
  onModifier: () => void
}) {
  const reponse =
    valeurs.filter(Boolean).length === 0
      ? 'Peu importe'
      : valeurs
          .filter(Boolean)
          .map((v) => libelleOption(question, v))
          .join(' · ')
  return (
    <div className="anim-bubble">
      <p className="font-sans text-[12px] font-light text-gris-texte">{question.label}</p>
      <button
        type="button"
        onClick={onModifier}
        className="mt-1 inline-flex max-w-full items-center gap-2 border border-white/15 bg-white/[0.04] px-3 py-1.5 text-left font-sans text-[12.5px] text-white transition-colors hover:border-sable"
      >
        <span className="truncate">{reponse}</span>
        <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.1em] text-sable">
          Modifier
        </span>
      </button>
    </div>
  )
}

export default function StepQualify({ state, dispatch }: StepQualifyProps) {
  // La liste des questions se dérive de la demande libre uniquement : elle reste
  // donc stable pendant tout l'échange, y compris en revenant en arrière.
  const questions = useMemo(() => questionsPour(detecterIntention(state.demande)), [state.demande])
  const posees = questions.filter((q) => q.id in state.reponses)
  const courante = questions.find((q) => !(q.id in state.reponses)) ?? null

  // Sélection en cours pour les questions à choix multiple.
  const [brouillon, setBrouillon] = useState<string[]>([])

  const repondre = (question: Question, valeurs: string[]) => {
    setBrouillon([])
    dispatch({ type: 'REPONDRE', questionId: question.id, valeurs })
  }

  const basculer = (valeur: string) => {
    // « Peu importe » (valeur vide) est exclusif des autres choix.
    if (valeur === '') {
      setBrouillon([])
      return
    }
    setBrouillon((v) => (v.includes(valeur) ? v.filter((x) => x !== valeur) : [...v, valeur]))
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>
        Qualification · {Math.min(posees.length + 1, questions.length)}/{questions.length}
      </StepEyebrow>

      {/* Fil des échanges déjà faits */}
      {posees.length > 0 && (
        <div className="mb-5 space-y-3 border-l border-white/10 pl-4">
          {posees.map((q) => (
            <EchangePasse
              key={q.id}
              question={q}
              valeurs={state.reponses[q.id]}
              onModifier={() => {
                setBrouillon([])
                dispatch({ type: 'ANNULER_REPONSE', questionId: q.id })
              }}
            />
          ))}
        </div>
      )}

      {courante ? (
        <>
          <div className="flex items-start gap-3">
            <Avatar />
            <div className="min-w-0 flex-1">
              <Prompt>{courante.label}</Prompt>
              {courante.hint && <Subtext>{courante.hint}</Subtext>}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {courante.options.map((o) => (
              <Chip
                key={o.value || 'peu-importe'}
                active={courante.multi && brouillon.includes(o.value)}
                onClick={() =>
                  courante.multi && o.value !== ''
                    ? basculer(o.value)
                    : repondre(courante, o.value === '' ? [] : [o.value])
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>

          <div className="mt-auto space-y-3 pt-6">
            {courante.multi && (
              <PrimaryButton
                onClick={() => repondre(courante, brouillon)}
                disabled={brouillon.length === 0}
              >
                {brouillon.length === 0 ? 'Choisissez une teinte' : `Valider (${brouillon.length})`}
              </PrimaryButton>
            )}
            <SecondaryButton onClick={() => repondre(courante, [])}>
              Passer cette question
            </SecondaryButton>
          </div>
        </>
      ) : (
        /* Toutes les questions ont été posées : on ne bascule pas tout seul,
           pour que le retour depuis l'écran suivant reste possible. */
        <>
          <div className="flex items-start gap-3">
            <Avatar />
            <div className="min-w-0 flex-1">
              <Prompt>J’ai ce qu’il me faut.</Prompt>
              <Subtext>
                Je passe en revue la collection et je vous soumets ma compréhension avant de vous
                montrer les pièces.
              </Subtext>
            </div>
          </div>
          <div className="mt-auto space-y-3 pt-6">
            <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'matching' })}>
              Voir ce que vous me proposez
            </PrimaryButton>
            <SecondaryButton onClick={() => dispatch({ type: 'RESET_QUALIFICATION' })}>
              Reprendre les questions
            </SecondaryButton>
          </div>
        </>
      )}
    </div>
  )
}
