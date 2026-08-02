import { parId } from '../data/catalogue'

interface Actualite {
  titre: string
  date: string
  oeuvreId: string
}

const ACTUALITES: Actualite[] = [
  {
    titre: 'Les Voyageurs de Bruno Catalano font escale à Honfleur',
    date: '02/06/2026',
    oeuvreId: 's1'
  },
  {
    titre: "Paul Beckrich sublime le bronze avec l'or 24 carats",
    date: '08/06/2026',
    oeuvreId: 's9'
  },
  {
    titre: 'Harding Meyer — nouveaux portraits en galerie',
    date: '15/06/2026',
    oeuvreId: 'p9'
  },
  {
    titre: "Andrea Roggi, l'amour coulé dans le bronze",
    date: '22/06/2026',
    oeuvreId: 's6'
  }
]

export default function Actualites() {
  return (
    <section id="actualites" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-12">
          <h2 className="section-title text-[30px] text-noir-bartoux sm:text-[42px]">Actualités</h2>
          <a
            href="#actualites"
            className="hidden font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-noir-bartoux/60 underline-offset-4 transition-colors hover:text-or-bartoux sm:inline"
          >
            Voir toutes nos actualités →
          </a>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-4">
          {ACTUALITES.map((a) => {
            const o = parId(a.oeuvreId)
            return (
              <article key={a.titre} className="group cursor-pointer">
                <div className="overflow-hidden rounded-sm border border-gris-bordure bg-white">
                  <img
                    src={o.image}
                    alt={`${o.titre} — ${o.artiste}`}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                </div>
                <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.18em] text-or-bartoux">
                  {a.date}
                </p>
                <h3 className="mt-2 font-serif text-[16px] leading-snug text-noir-bartoux transition-colors group-hover:text-or-bartoux sm:text-[18px]">
                  {a.titre}
                </h3>
              </article>
            )
          })}
        </div>

        <a
          href="#actualites"
          className="mt-8 inline-block font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-noir-bartoux/60 underline-offset-4 transition-colors hover:text-or-bartoux sm:hidden"
        >
          Voir toutes nos actualités →
        </a>
      </div>
    </section>
  )
}
