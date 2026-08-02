import type { ReactNode } from 'react'

/** Intitulé/question d'étape en registre éditorial (serif), remplace l'ancienne bulle chat. */
export function Prompt({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`anim-bubble font-serif text-[20px] font-medium leading-[1.25] text-white ${className}`}>
      {children}
    </p>
  )
}

/** Texte secondaire discret sous un Prompt. */
export function Subtext({ children }: { children: ReactNode }) {
  return (
    <p className="anim-bubble mt-2 font-sans text-[13px] font-light leading-relaxed text-gris-texte">
      {children}
    </p>
  )
}

/** Petit intitulé d'étape, doré, en capitales espacées. */
export function StepEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-or-bartoux">
      {children}
    </p>
  )
}

/** CTA principal du widget : fond doré, texte noir. */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  type = 'button'
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-lg bg-or-bartoux px-5 py-3.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-noir-bartoux transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
    >
      {children}
    </button>
  )
}

/** CTA secondaire : lien texte discret. */
export function SecondaryButton({
  children,
  onClick
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-1 text-center font-sans text-[12px] font-light text-gris-texte transition-colors duration-200 hover:text-white"
    >
      {children}
    </button>
  )
}

/** Avatar rond du conseiller (initiales GB sur fond doré). */
export function Avatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-or-bartoux font-serif text-[15px] font-semibold text-noir-bartoux">
      GB
    </div>
  )
}
