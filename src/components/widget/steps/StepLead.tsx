import { useState } from 'react'
import type { FormEvent } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton } from '../ui'

interface StepLeadProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function StepLead({ state, dispatch }: StepLeadProps) {
  const [sending, setSending] = useState(false)

  const valid = EMAIL_RE.test(state.email.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid || sending) return
    // Aucun backend : on simule l'envoi.
    setSending(true)
    setTimeout(() => dispatch({ type: 'GOTO', step: 'done' }), 1500)
  }

  const nb = state.selection.length
  const objet =
    nb > 1 ? `vos ${nb} coups de cœur` : `« ${state.selected?.titre ?? 'cette œuvre'} »`

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col p-5">
      <StepEyebrow>Dernière étape</StepEyebrow>
      <Prompt>Recevez les informations sur {objet}</Prompt>
      <Subtext>Laissez votre email : le conseiller vous recontacte avec le rendu joint.</Subtext>

      <div className="mt-5 space-y-3">
        <input
          type="email"
          className="field"
          placeholder="Votre adresse email"
          autoComplete="email"
          value={state.email}
          disabled={sending}
          onChange={(e) => dispatch({ type: 'SET_EMAIL', value: e.target.value })}
        />
        <textarea
          className="field-area"
          rows={3}
          placeholder="Un message pour le conseiller (facultatif)"
          value={state.message}
          disabled={sending}
          onChange={(e) => dispatch({ type: 'SET_MESSAGE', value: e.target.value })}
        />
      </div>

      <div className="mt-auto pt-6">
        <PrimaryButton type="submit" disabled={!valid || sending}>
          {sending ? 'Envoi en cours…' : 'Envoyer ma demande'}
        </PrimaryButton>
        <p className="mt-3 text-center font-sans text-[10px] font-light leading-relaxed text-gris-texte">
          Vos informations ne servent qu'à vous recontacter au sujet de votre sélection.
        </p>
      </div>
    </form>
  )
}
