import { useReducer, useEffect } from 'react'
import { widgetReducer, initialWidgetState } from './state'
import WidgetLauncher from './WidgetLauncher'
import WidgetPanel from './WidgetPanel'

interface WidgetProps {
  open: boolean
  setOpen: (value: boolean) => void
}

/**
 * Composant racine du widget conseiller.
 * - L'ouverture est pilotée par App (plusieurs points d'entrée sur la page).
 * - L'état conversationnel vit ici (useReducer) et persiste tant qu'on ne
 *   réinitialise pas : fermer puis rouvrir reprend là où on s'était arrêté.
 * - Le panneau (et donc les composants d'étapes) n'est monté que lorsque
 *   le widget est ouvert (rendu conditionnel).
 */
export default function Widget({ open, setOpen }: WidgetProps) {
  const [state, dispatch] = useReducer(widgetReducer, initialWidgetState)

  // Fermeture au clavier (Échap).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const parcourirBoutique = () => {
    setOpen(false)
    document.getElementById('grille-produits')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <WidgetLauncher open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <WidgetPanel
          state={state}
          dispatch={dispatch}
          onClose={() => setOpen(false)}
          onRestart={() => dispatch({ type: 'RESET' })}
          onBrowse={parcourirBoutique}
        />
      )}
    </>
  )
}
