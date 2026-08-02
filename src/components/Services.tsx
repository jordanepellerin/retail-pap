interface ServicesProps {
  onOpenWidget: () => void
}

const ARGUMENTS = [
  {
    titre: 'Sans intermédiaire',
    texte:
      'Nous vendons uniquement en direct, dans nos boutiques et ici. Pas de grossiste, donc pas de marge en cascade.'
  },
  {
    titre: 'Pièces séparables',
    texte:
      'Veste et pantalon se commandent dans deux tailles différentes. Le costume tombe juste sans retouche.'
  },
  {
    titre: 'Retours offerts',
    texte:
      'Trente jours pour essayer chez vous. Livraison et retour à notre charge, en France comme en Europe.'
  }
]

/**
 * Bande de réassurance + point d'entrée éditorial vers le widget. C'est le
 * second appel du conseiller sur la page, après le bouton flottant.
 */
export default function Services({ onOpenWidget }: ServicesProps) {
  return (
    <>
      <section className="border-y border-filet bg-craie">
        <div className="mx-auto grid max-w-content gap-8 px-4 py-14 sm:px-8 md:grid-cols-3">
          {ARGUMENTS.map((a) => (
            <div key={a.titre}>
              <h3 className="font-serif text-[21px] text-encre">{a.titre}</h3>
              <p className="mt-2 font-sans text-[13.5px] font-light leading-relaxed text-ardoise">
                {a.texte}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-20 text-center sm:px-8">
        <p className="eyebrow">Conseiller de style</p>
        <h2 className="mx-auto mt-3 max-w-[640px] font-serif text-[34px] leading-[1.15] sm:text-[42px]">
          Vous ne savez pas par où commencer&nbsp;?
        </h2>
        <p className="mx-auto mt-5 max-w-[560px] font-sans text-[15px] font-light leading-[1.75] text-ardoise">
          Dites-nous l’occasion, la matière et le budget. Nous composons la tenue, et vous l’essayez
          sur votre propre photo avant de commander.
        </p>
        <button type="button" onClick={onOpenWidget} className="btn-encre mt-8 px-9 py-4">
          Composer ma tenue
        </button>
      </section>
    </>
  )
}
