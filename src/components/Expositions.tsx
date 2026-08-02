import { parId } from '../data/catalogue'

const EXPO_IMAGE = parId('s1').image // Bruno Catalano — Cristian

export default function Expositions() {
  return (
    <section id="expositions" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="section-title text-[30px] text-noir-bartoux sm:text-[42px]">Expositions</h2>
          <a
            href="#expositions"
            className="hidden font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-noir-bartoux/60 underline-offset-4 transition-colors hover:text-or-bartoux sm:inline"
          >
            Voir toutes nos expositions →
          </a>
        </div>

        <article className="group cursor-pointer">
          <div className="overflow-hidden rounded-sm">
            <img
              src={EXPO_IMAGE}
              alt="Les Voyageurs de Bruno Catalano à Honfleur"
              loading="lazy"
              className="aspect-[16/10] w-full object-cover object-[center_30%] transition-transform duration-700 ease-out group-hover:scale-[1.03] sm:aspect-[21/9]"
            />
          </div>
          <div className="mt-6 max-w-3xl">
            <p className="eyebrow">Exposition monumentale</p>
            <h3 className="section-title mt-3 text-[24px] leading-[1.15] text-noir-bartoux sm:text-[32px]">
              Les Voyageurs de Bruno Catalano font escale à Honfleur
            </h3>
            <p className="mt-3 font-sans text-[13px] uppercase tracking-[0.18em] text-or-bartoux">
              Du 02/06/2026 au 02/11/2026
            </p>
          </div>
        </article>

        <a
          href="#expositions"
          className="mt-8 inline-block font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-noir-bartoux/60 underline-offset-4 transition-colors hover:text-or-bartoux sm:hidden"
        >
          Voir toutes nos expositions →
        </a>
      </div>
    </section>
  )
}
