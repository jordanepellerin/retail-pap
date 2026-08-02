import { parId } from '../data/catalogue'

// Triptyque : trois œuvres de la maison — sculpture, peinture, céramique.
const TRIPTYQUE = ['s8', 'p4', 's10'].map(parId)

export default function Histoire() {
  return (
    <section id="histoire" className="bg-gris-clair py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {TRIPTYQUE.map((o) => (
            <div key={o.id} className="overflow-hidden rounded-sm border border-gris-bordure bg-white">
              <img
                src={o.image}
                alt={`${o.titre} — ${o.artiste}`}
                loading="lazy"
                className="aspect-[3/4] w-full object-contain"
              />
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center">
          <p className="eyebrow">Maison d'art · Depuis 1993</p>
          <h2 className="section-title mt-4 text-[28px] text-noir-bartoux sm:text-[40px]">
            L'histoire des Galeries Bartoux
          </h2>
          <p className="mt-4 font-serif text-[20px] font-light italic text-gris-texte sm:text-[24px]">
            Un nouveau regard sur l'art contemporain.
          </p>
          <p className="mx-auto mt-5 max-w-xl font-sans text-[14px] font-light leading-[1.75] text-gris-texte">
            D'une première galerie à Honfleur à un réseau international — Paris, Saint-Paul-de-Vence,
            Cannes, Courchevel, Knokke, Las Vegas, Miami, Singapour — la même passion de partager
            l'art le plus exigeant.
          </p>
          <a href="#histoire" className="btn-outline-dark mt-8 px-8 py-4">
            En savoir plus →
          </a>
        </div>
      </div>
    </section>
  )
}
