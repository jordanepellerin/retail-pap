import type { ReactNode } from 'react'
import type { Article } from '../../types'
import { formatPrix } from '../../data/catalogue'

/** Question/intitulé d'étape en registre éditorial (serif). */
export function Prompt({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`anim-bubble font-serif text-[21px] font-medium leading-[1.25] text-white ${className}`}
    >
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

/** Petit intitulé d'étape, en capitales espacées. */
export function StepEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-sans text-[10px] font-medium uppercase tracking-[0.24em] text-sable">
      {children}
    </p>
  )
}

/** CTA principal du widget : bloc sable, texte noir, angles droits. */
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
      className="w-full bg-sable px-5 py-3.5 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-noir-encre transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
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

/** Puce cliquable — suggestions de l'étape demande, réponses de qualification. */
export function Chip({
  children,
  onClick,
  active = false
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? 'chip-active' : ''}`}
    >
      <span className="flex items-center justify-between gap-3">
        {children}
        {active && (
          <span className="shrink-0 text-sable" aria-hidden="true">
            ✓
          </span>
        )}
      </span>
    </button>
  )
}

/** Avatar rond du conseiller (initiales de la maison). */
export function Avatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sable font-serif text-[14px] font-semibold text-noir-encre">
      AL
    </div>
  )
}

/**
 * Vignette produit compacte, réutilisée par la bande de tenue, le
 * récapitulatif et la planche de rendu. Le visuel retombe sur le dégradé de
 * l'article si le fichier est absent (catalogue en cours de remplacement).
 */
export function VignetteArticle({
  article,
  taille = 56
}: {
  article: Article
  taille?: number
}) {
  return (
    <span
      className="block shrink-0 overflow-hidden border border-white/10"
      style={{ width: taille, height: taille * 1.25, background: article.gradient }}
    >
      <img
        src={article.image}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
    </span>
  )
}

/** Ligne « nom · matière · prix » d'un article. */
export function LigneArticle({ article }: { article: Article }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-serif text-[15px] leading-tight text-white">
        {article.nom}
      </span>
      <span className="mt-0.5 block truncate font-sans text-[11.5px] font-light text-gris-texte">
        {article.couleur} · {article.matiere}
      </span>
      <span className="mt-0.5 block font-sans text-[12px] text-sable">
        {formatPrix(article.prix)}
      </span>
    </span>
  )
}
