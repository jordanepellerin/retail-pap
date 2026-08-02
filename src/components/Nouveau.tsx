import { parId } from '../data/catalogue'

const OEUVRE = parId('s4') // Bruno Catalano — Raphaël

export default function Nouveau() {
  return (
    <section id="nouveau" className="bg-gris-clair py-16 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <h2 className="section-title mb-8 text-[30px] text-noir-bartoux sm:text-[42px]">Nouveau</h2>

        <article className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="overflow-hidden rounded-sm border border-gris-bordure bg-white">
            <img
              src={OEUVRE.image}
              alt={`${OEUVRE.titre} — ${OEUVRE.artiste}`}
              loading="lazy"
              className="aspect-[4/3] w-full object-contain"
            />
          </div>
          <div>
            <p className="eyebrow">À la une</p>
            <h3 className="section-title mt-3 text-[22px] leading-[1.2] text-noir-bartoux sm:text-[28px]">
              Honfleur célèbre l'arrivée des sculptures monumentales de Bruno Catalano
            </h3>
            <p className="mt-5 font-sans text-[14px] font-light leading-[1.8] text-gris-texte">
              À l'occasion de l'inauguration de l'exposition monumentale de Bruno Catalano à
              Honfleur, la ville accueille cet été plusieurs sculptures emblématiques de l'artiste
              dans son centre historique. Présent à l'ouverture, le maire de Honfleur a exprimé sa
              joie de voir ces œuvres prendre place au cœur de la cité, le long des quais et sur la
              place Berthelot.
            </p>
            <a
              href="#nouveau"
              className="mt-6 inline-block font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-or-bartoux underline-offset-4 hover:underline"
            >
              Lire la suite →
            </a>
          </div>
        </article>
      </div>
    </section>
  )
}
