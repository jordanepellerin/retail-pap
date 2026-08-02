import { useEffect, useRef, useState } from 'react'
import type { WidgetState } from '../../types'
import type { WidgetDispatch } from './state'
import { previousStep } from './state'
import { Avatar } from './ui'
import { MinimizeIcon, ExpandIcon, ReduceIcon, HeartIcon } from '../icons'
import StepWelcome from './steps/StepWelcome'
import StepType from './steps/StepType'
import StepPhoto from './steps/StepPhoto'
import StepMatching from './steps/StepMatching'
import StepPresentation from './steps/StepPresentation'
import StepResults from './steps/StepResults'
import StepRender from './steps/StepRender'
import StepLead from './steps/StepLead'
import StepDone from './steps/StepDone'

interface WidgetPanelProps {
  state: WidgetState
  dispatch: WidgetDispatch
  onClose: () => void
  onRestart: () => void
  onBrowse: () => void
}

export default function WidgetPanel({
  state,
  dispatch,
  onClose,
  onRestart,
  onBrowse
}: WidgetPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  // Focus sur le premier élément interactif à l'ouverture du panneau.
  useEffect(() => {
    const first = bodyRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    first?.focus()
  }, [])

  // Repositionner le scroll en haut à chaque changement d'étape.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [state.step])

  function renderStep() {
    switch (state.step) {
      case 'welcome':
        return <StepWelcome dispatch={dispatch} onBrowse={onBrowse} />
      case 'type':
        return <StepType state={state} dispatch={dispatch} />
      case 'photo':
        return <StepPhoto state={state} dispatch={dispatch} />
      case 'matching':
        return <StepMatching state={state} dispatch={dispatch} />
      case 'presentation':
        return <StepPresentation state={state} dispatch={dispatch} />
      case 'results':
        return <StepResults state={state} dispatch={dispatch} />
      case 'render':
        return <StepRender state={state} dispatch={dispatch} />
      case 'lead':
        return <StepLead state={state} dispatch={dispatch} />
      case 'done':
        return <StepDone state={state} dispatch={dispatch} />
      default:
        return null
    }
  }

  const headerBtn =
    'flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white'

  const back = previousStep[state.step]
  const selectionCount = state.selection.length
  // La barre de sélection reste visible tant que le visiteur construit sa liste,
  // sauf sur l'écran de confirmation où la demande est déjà partie.
  const showSelectionBar = selectionCount > 0 && state.step !== 'done'

  const panelCls = expanded
    ? // Centrage par `inset-0 m-auto` (pas de transform, pour ne pas entrer en
      // conflit avec le transform final de l'animation d'ouverture).
      'anim-widget-open fixed inset-0 z-50 m-auto flex h-[min(760px,calc(100vh-32px))] w-[min(680px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-or-bartoux/30 bg-noir-bartoux shadow-[0_40px_100px_rgba(0,0,0,0.8)]'
    : 'anim-widget-open fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-or-bartoux/30 bg-noir-bartoux shadow-[0_40px_100px_rgba(0,0,0,0.8)] sm:inset-auto sm:bottom-[84px] sm:right-6 sm:h-[580px] sm:max-h-[calc(100vh-120px)] sm:w-[400px] sm:max-w-[calc(100vw-32px)]'

  return (
    <>
      {/* Voile sombre en mode agrandi (clic = réduire) */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal={expanded}
        aria-label="Conseiller Bartoux — assistant de sélection d'œuvre"
        className={panelCls}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-or-bartoux/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar />
            <div className="leading-tight">
              <p className="font-sans text-[13px] font-medium text-white">Conseiller d'art</p>
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-or-bartoux/80">
                Galeries Bartoux
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Réduire la fenêtre' : 'Agrandir la fenêtre'}
              className={`${headerBtn} hidden sm:flex`}
            >
              {expanded ? (
                <ReduceIcon className="h-[17px] w-[17px]" />
              ) : (
                <ExpandIcon className="h-[17px] w-[17px]" />
              )}
            </button>
            <button
              type="button"
              onClick={onRestart}
              aria-label="Recommencer la conversation"
              className={headerBtn}
            >
              <span className="text-[17px]" aria-hidden="true">
                ↺
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Réduire en bouton"
              title="Réduire en bouton"
              className={headerBtn}
            >
              <MinimizeIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Badge de sélection — persistant sous l'en-tête : le visiteur voit qu'il
            construit une liste, et peut y revenir d'un geste depuis n'importe quelle étape */}
        {showSelectionBar && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'GOTO', step: 'results' })}
            aria-label={`Ma sélection — ${selectionCount} œuvre${selectionCount > 1 ? 's' : ''}. Revenir à ma sélection.`}
            className="flex shrink-0 items-center justify-between gap-2 border-b border-or-bartoux/15 bg-or-bartoux/[0.07] px-4 py-2 text-left transition-colors hover:bg-or-bartoux/[0.12]"
          >
            <span className="flex items-center gap-2 font-sans text-[12px] font-medium text-or-bartoux">
              <HeartIcon className="h-3.5 w-3.5" />
              Ma sélection · {selectionCount} œuvre{selectionCount > 1 ? 's' : ''}
            </span>
            {state.step !== 'results' && (
              <span className="font-sans text-[11px] font-light uppercase tracking-[0.1em] text-or-bartoux/70">
                Voir →
              </span>
            )}
          </button>
        )}

        {/* Corps — défile, chaque étape gère sa mise en page interne */}
        <div ref={bodyRef} className="widget-scroll flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col">
            {back && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'GOTO', step: back })}
                className="shrink-0 px-5 pt-4 text-left font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-gris-texte transition-colors hover:text-white"
              >
                ‹ Retour
              </button>
            )}
            <div className="flex min-h-0 flex-1 flex-col">{renderStep()}</div>
          </div>
        </div>
      </div>
    </>
  )
}
