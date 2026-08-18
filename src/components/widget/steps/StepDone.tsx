import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, SecondaryButton } from '../ui'
import { formatPrix } from '../../../data/catalogue'
import { totalTenue } from '../../../lib/tenue'

interface StepDoneProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

function LigneRecap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[0.14em] text-gris-texte">
        {label}
      </span>
      <span className="text-right font-sans text-[12px] text-noir-encre">{value}</span>
    </div>
  )
}

export default function StepDone({ state, dispatch }: StepDoneProps) {
  const tenue = state.tenue

  return (
    <div className="flex min-h-full flex-col p-5">
      <div className="flex justify-center pt-2">
        <div className="anim-pop-in flex h-16 w-16 items-center justify-center rounded-full bg-noir-encre">
          <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Prompt>C’est envoyé.</Prompt>
        <Subtext>
          Votre tenue et votre essayage partent à l’instant. Livraison et retours offerts — vous
          avez trente jours pour changer d’avis.
        </Subtext>
      </div>

      <div className="mt-5 border border-gris-bordure bg-gris-clair p-4">
        <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-gris-texte">
          Votre tenue
        </p>
        <div className="divide-y divide-white/5">
          {tenue.map((a) => (
            <div key={a.id} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate font-serif text-[14px] text-noir-encre">{a.nom}</span>
              <span className="shrink-0 font-sans text-[11px] tracking-[0.06em] text-gris-texte">
                {formatPrix(a.prix)}
              </span>
            </div>
          ))}
          <LigneRecap label="Total" value={formatPrix(totalTenue(tenue))} />
          <LigneRecap label="Contact" value={state.email || '—'} />
          {state.demande.trim() && (
            <LigneRecap label="Votre demande" value={state.demande.trim()} />
          )}
          {state.message.trim() && <LigneRecap label="Message" value={state.message.trim()} />}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <SecondaryButton onClick={() => dispatch({ type: 'RESET' })}>
          Composer une autre tenue
        </SecondaryButton>
      </div>
    </div>
  )
}
