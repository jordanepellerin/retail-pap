interface LogoProps {
  className?: string
  large?: boolean
}

/**
 * Wordmark André Laurent — texte pur (aucun fichier image), à la façon des
 * maisons de prêt-à-porter : serif à fort contraste, capitales très espacées.
 */
export default function Logo({ className = '', large = false }: LogoProps) {
  return (
    <span
      className={`select-none whitespace-nowrap font-serif font-medium leading-none ${
        large ? 'text-[26px] tracking-[0.18em]' : 'text-[19px] tracking-[0.2em]'
      } ${className}`}
    >
      ANDRÉ LAURENT
    </span>
  )
}
