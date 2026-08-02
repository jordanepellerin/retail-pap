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
          ? // Ouvert : croix sur fond encre (masqué sur mobile, panneau plein écran)
            'fixed bottom-6 right-6 z-50 hidden h-14 w-14 items-center justify-center border border-encre bg-encre text-white shadow-[0_8px_32px_rgba(22,32,46,0.35)] transition-all duration-200 hover:bg-encre-clair sm:flex'
          : // Fermé : pilule bordeaux à angles droits — la couleur de signature
            // du conseiller, seul aplat coloré d'une page en encre et craie.
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 border border-bordeaux bg-bordeaux px-[22px] py-[14px] font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-white shadow-[0_8px_32px_rgba(123,45,59,0.32)] transition-all duration-200 hover:bg-bordeaux-clair'
      }
    >
      {open ? (
        <CloseIcon className="h-6 w-6" />
      ) : (
        <>
          <span className="text-white/70" aria-hidden="true">
            ✦
          </span>
          <span>Trouver ma tenue</span>
        </>
      )}
    </button>
  )
}
