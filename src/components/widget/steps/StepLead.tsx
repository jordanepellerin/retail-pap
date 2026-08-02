import { useState } from 'react'
import type { FormEvent } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton } from '../ui'
import { formatPrix } from '../../../data/catalogue'
import { totalTenue } from '../../../lib/tenue'
import { MESSAGE_MAX } from '../../../types/ai'

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

  const nb = state.tenue.length

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col p-5">
      <StepEyebrow>Dernière étape</StepEyebrow>
      <Prompt>
        Recevez votre tenue — {nb} pièce{nb > 1 ? 's' : ''}, {formatPrix(totalTenue(state.tenue))}
      </Prompt>
      <Subtext>
        Je vous envoie la liste, les tailles disponibles et votre essayage en pièce jointe. Un
        conseiller reste joignable si vous hésitez entre deux tailles.
      </Subtext>

      <div className="mt-5 space-y-3">
        <input
          type="email"
          className="field"
          placeholder="Votre adresse e-mail"
          autoComplete="email"
          value={state.email}
          disabled={sending}
          onChange={(e) => dispatch({ type: 'SET_EMAIL', value: e.target.value })}
        />
        <textarea
          className="field-area"
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder="Une question sur les tailles ou les retouches ? (facultatif)"
          value={state.message}
          disabled={sending}
          onChange={(e) => dispatch({ type: 'SET_MESSAGE', value: e.target.value })}
        />
      </div>

      <div className="mt-auto pt-6">
        <PrimaryButton type="submit" disabled={!valid || sending}>
          {sending ? 'Envoi en cours…' : 'Envoyer ma tenue'}
        </PrimaryButton>
        <p className="mt-3 text-center font-sans text-[10px] font-light leading-relaxed text-gris-texte">
          Vos informations ne servent qu’à vous envoyer cette sélection.
        </p>
      </div>
    </form>
  )
}
