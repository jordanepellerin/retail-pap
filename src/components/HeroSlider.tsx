import { useEffect, useState } from 'react'
import { parId } from '../data/catalogue'

interface HeroSliderProps {
  onOpenWidget: () => void
}

interface Slide {
  image: string
  eyebrow: string
  titre: string
  sous: string
  ctaLabel: string
  href?: string
  widget?: boolean
}

const SLIDES: Slide[] = [
  {
    image: parId('s1').image, // Bruno Catalano — Cristian
    eyebrow: 'Exposition monumentale · Honfleur',
    titre: 'Les Voyageurs de Bruno Catalano',
    sous: 'Du 02 juin au 02 novembre 2026 — un parcours à ciel ouvert dans le centre historique.',
    ctaLabel: "Découvrir l'exposition",
    href: '#expositions'
  },
  {
    image: parId('s5').image, // Andrea Roggi — Destinati ad Amarsi
    eyebrow: 'Sculpture contemporaine',
    titre: 'Andrea Roggi, la vie en bronze',
    sous: 'Cercles de vie, oliviers et figures enlacées — le bronze poli du maître toscan.',
    ctaLabel: 'Voir la sélection',
    href: '#coups-de-coeur'
  },
  {
    image: parId('p10').image, // Harding Meyer — Portrait nº 8
    eyebrow: "Maison d'art · Depuis 1993",
    titre: 'Peintres, sculpteurs & grands maîtres',
    sous: "Une sélection d'exception. Trouvez l'œuvre qui vous ressemble en quelques minutes.",
    ctaLabel: '✦ Trouver mon œuvre',
    widget: true
  }
]

export default function HeroSlider({ onOpenWidget }: HeroSliderProps) {
  const [current, setCurrent] = useState(0)
  const [reduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )

  // Défilement automatique (désactivé si prefers-reduced-motion).
  useEffect(() => {
    if (reduced) return
    const id = setTimeout(() => setCurrent((c) => (c + 1) % SLIDES.length), 6000)
    return () => clearTimeout(id)
  }, [current, reduced])

  const go = (i: number) => setCurrent((i + SLIDES.length) % SLIDES.length)
  const slide = SLIDES[current]

  const arrowCls =
    'absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[20px] text-noir-bartoux shadow-md transition-colors hover:text-or-bartoux'

  return (
    <section id="top" className="bg-white pt-10 pb-14 sm:pt-12 sm:pb-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Carrousel contenu (pas pleine largeur) */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl sm:aspect-[2/1] sm:rounded-2xl">
          {SLIDES.map((s, i) => (
            <img
              key={s.titre}
              src={s.image}
              alt={s.titre}
              loading={i === 0 ? 'eager' : 'lazy'}
              aria-hidden={i !== current}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === current ? 'opacity-100' : 'opacity-0'
              } ${i === current && !reduced ? 'anim-kenburns' : ''}`}
            />
          ))}

          <button type="button" onClick={() => go(current - 1)} aria-label="Précédent" className={`${arrowCls} left-4`}>
            ‹
          </button>
          <button type="button" onClick={() => go(current + 1)} aria-label="Suivant" className={`${arrowCls} right-4`}>
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.titre}
                type="button"
                onClick={() => go(i)}
                aria-label={`Aller à l'exposition ${i + 1}`}
                aria-current={i === current}
                className={`h-1.5 rounded-full shadow transition-all duration-300 ${
                  i === current ? 'w-7 bg-or-bartoux' : 'w-1.5 bg-white/80 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Légende — sous le carrousel, texte noir */}
        <div key={current} className="anim-bubble mx-auto mt-8 max-w-2xl text-center">
          <p className="eyebrow">{slide.eyebrow}</p>
          <h1 className="mt-3 font-serif text-[30px] font-medium leading-[1.08] text-noir-bartoux sm:text-[46px]">
            {slide.titre}
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-sans text-[15px] font-light leading-[1.7] text-gris-texte sm:text-[16px]">
            {slide.sous}
          </p>
          <div className="mt-7">
            {slide.widget ? (
              <button type="button" onClick={onOpenWidget} className="btn-gold px-8 py-4">
                {slide.ctaLabel}
              </button>
            ) : (
              <a href={slide.href} className="btn-dark px-8 py-4">
                {slide.ctaLabel} →
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
