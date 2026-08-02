import { CloseIcon } from '../icons'

interface WidgetLauncherProps {
  open: boolean
  onToggle: () => void
}

export default function WidgetLauncher({ open, onToggle }: WidgetLauncherProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={
        open ? 'Fermer le conseiller André Laurent' : 'Composer ma tenue avec le conseiller'
      }
      className={
        open
          ? // Ouvert : croix sur fond sable (masqué sur mobile, panneau plein écran)
            'fixed bottom-6 right-6 z-50 hidden h-14 w-14 items-center justify-center border border-sable bg-sable text-noir-encre shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all duration-200 hover:brightness-95 sm:flex'
          : // Fermé : pilule sombre à angles droits, dans le registre de la boutique
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 border border-noir-encre bg-noir-encre px-[22px] py-[14px] font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-black'
      }
    >
      {open ? (
        <CloseIcon className="h-6 w-6" />
      ) : (
        <>
          <span className="text-sable" aria-hidden="true">
            ✦
          </span>
          <span>Trouver ma tenue</span>
        </>
      )}
    </button>
  )
}
