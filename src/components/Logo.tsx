interface LogoProps {
  /** Variante de taille : compacte (nav) ou grande (footer). */
  large?: boolean
  className?: string
}

/**
 * Wordmark « GALERIES BARTOUX » rendu en CSS (toujours fiable, identique au site).
 * Deux lignes serif : GALERIES (fin, très espacé) au-dessus de BARTOUX (gras).
 */
export default function Logo({ large = false, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex select-none flex-col items-center leading-none ${className}`}>
      <span
        className={`font-serif ${large ? 'text-[12px]' : 'text-[9px]'}`}
        style={{ letterSpacing: '0.5em', paddingLeft: '0.5em' }}
      >
        GALERIES
      </span>
      <span
        className={`font-serif font-semibold ${large ? 'mt-1 text-[26px]' : 'text-[19px]'}`}
        style={{ letterSpacing: '0.28em', paddingLeft: '0.28em' }}
      >
        BARTOUX
      </span>
    </span>
  )
}
