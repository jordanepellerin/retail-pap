import { parId } from '../data/catalogue'

// Six œuvres du catalogue — photos officielles, jamais recadrées (object-contain).
const SELECTION = ['s2', 's7', 'p1', 'p5', 'p12', 's11'].map(parId)

export default function CoupsDeCoeur() {
  return (
    <section id="coups-de-coeur" className="bg-gris-clair py-16 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="mb-10 text-center sm:mb-14">
          <p className="eyebrow">La sélection</p>
          <h2 className="section-title mt-4 text-[30px] text-noir-bartoux sm:text-[42px]">
            Nos coups de cœur
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3">
          {SELECTION.map((o) => (
            <article key={o.id} className="group cursor-pointer">
              <div className="overflow-hidden rounded-sm border border-gris-bordure bg-white">
                <img
                  src={o.image}
                  alt={`${o.titre} — ${o.artiste}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="pt-4">
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-or-bartoux">
                  {o.artiste}
                </p>
                <h3 className="mt-1.5 font-serif text-[18px] leading-tight text-noir-bartoux">
                  {o.titre}
                </h3>
                <p className="mt-1 font-sans text-[11px] font-light uppercase tracking-[0.1em] text-gris-texte">
                  {o.medium}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
