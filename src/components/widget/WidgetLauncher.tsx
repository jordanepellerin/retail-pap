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
        open ? 'Fermer le conseiller Bartoux' : 'Trouver mon œuvre avec le conseiller Bartoux'
      }
      className={
        open
          ? // État ouvert : croix, fond doré, texte noir (masqué sur mobile où le panneau est plein écran)
            'fixed bottom-6 right-6 z-50 hidden h-14 w-14 items-center justify-center rounded-full border border-or-bartoux bg-or-bartoux text-noir-bartoux shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-200 hover:brightness-95 sm:flex'
          : // État fermé : pilule sombre, bordure dorée
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-or-bartoux bg-noir-bartoux px-[22px] py-[14px] font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-200 hover:bg-black'
      }
    >
      {open ? (
        <CloseIcon className="h-6 w-6" />
      ) : (
        <>
          <span className="text-or-bartoux" aria-hidden="true">
            ✦
          </span>
          <span>Trouver mon œuvre</span>
        </>
      )}
    </button>
  )
}
