import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, SecondaryButton } from '../ui'

interface StepDoneProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-[0.12em] text-gris-texte">
        {label}
      </span>
      <span className="text-right font-sans text-[12px] text-white">{value}</span>
    </div>
  )
}

export default function StepDone({ state, dispatch }: StepDoneProps) {
  const oeuvre = state.selected
  const oeuvres = state.selection.length ? state.selection : oeuvre ? [oeuvre] : []

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* Checkmark */}
      <div className="flex justify-center pt-2">
        <div className="anim-pop-in flex h-16 w-16 items-center justify-center rounded-full bg-or-bartoux">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2.5} className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Prompt>Merci.</Prompt>
        <Subtext>
          Votre demande est transmise au conseiller avec le rendu joint. Il vous recontacte sous
          24 heures.
        </Subtext>
      </div>

      {/* Récapitulatif */}
      <div className="mt-5 rounded-lg bg-[#1A1A1A] p-4">
        <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-or-bartoux">
          {oeuvres.length > 1 ? 'Votre sélection transmise' : 'Transmis au conseiller'}
        </p>
        <div className="divide-y divide-white/5">
          {oeuvres.map((o) => (
            <div key={o.id} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate font-serif text-[14px] text-white">
                {o.titre}
                {oeuvre?.id === o.id && oeuvres.length > 1 && (
                  <span className="ml-2 font-sans text-[9px] uppercase tracking-[0.12em] text-or-bartoux">
                    Rendu joint
                  </span>
                )}
              </span>
              <span className="shrink-0 font-sans text-[11px] uppercase tracking-[0.12em] text-gris-texte">
                {o.artiste}
              </span>
            </div>
          ))}
          {oeuvres.length <= 1 && <RecapLine label="Rendu visuel" value="Joint à la demande" />}
          <RecapLine label="Contact" value={state.email || '—'} />
          {state.recherche.trim() && (
            <RecapLine label="Votre recherche" value={state.recherche.trim()} />
          )}
          {state.description.trim() && (
            <RecapLine label="Note sur l'espace" value={state.description.trim()} />
          )}
          {state.message.trim() && <RecapLine label="Message" value={state.message.trim()} />}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <SecondaryButton onClick={() => dispatch({ type: 'RESET' })}>
          Nouvelle recherche
        </SecondaryButton>
      </div>
    </div>
  )
}
