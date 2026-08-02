import { parId } from '../data/catalogue'

interface DecouvrezArtistesProps {
  onOpenWidget: () => void
}

const OEUVRE = parId('s3') // Bruno Catalano — Hubert au Bandeau

export default function DecouvrezArtistes({ onOpenWidget }: DecouvrezArtistesProps) {
  return (
    <section id="artistes" className="border-t border-gris-bordure bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-content items-center gap-10 px-5 sm:px-8 md:grid-cols-2 md:gap-16">
        <div className="overflow-hidden rounded-sm border border-gris-bordure bg-white">
          <img
            src={OEUVRE.image}
            alt={`${OEUVRE.titre} — ${OEUVRE.artiste}`}
            loading="lazy"
            className="aspect-[4/5] w-full object-contain"
          />
        </div>

        <div>
          <p className="eyebrow">La maison</p>
          <h2 className="section-title mt-4 text-[32px] text-noir-bartoux sm:text-[42px]">
            Découvrez nos artistes
          </h2>
          <p className="mt-5 max-w-lg font-sans text-[15px] font-light leading-[1.75] text-gris-texte">
            De Bruno Catalano à Harding Meyer, d'Andrea Roggi à Kiko — une sélection exigeante,
            réunie pour la maîtrise du geste et la puissance de l'expression.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="#coups-de-coeur" className="btn-outline-dark px-8 py-4">
              Découvrir les artistes →
            </a>
            <button type="button" onClick={onOpenWidget} className="btn-gold px-8 py-4">
              ✦ Trouver mon œuvre
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
