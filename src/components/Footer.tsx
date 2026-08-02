import Logo from './Logo'
import { InstagramIcon } from './icons'

const COLONNES = [
  {
    titre: 'La maison',
    liens: ['Notre histoire', 'Fabrication', 'Boutiques', 'Nous écrire']
  },
  {
    titre: 'Aide',
    liens: ['Guide des tailles', 'Livraison', 'Retours & échanges', 'Entretien']
  },
  {
    titre: 'Vestiaire',
    liens: ['Costumes', 'Chemises', 'Chaussures', 'Accessoires']
  }
]

export default function Footer() {
  return (
    <footer className="border-t border-filet bg-blanc">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo large className="text-encre" />
            <p className="mt-4 max-w-[260px] font-sans text-[12.5px] font-light leading-relaxed text-ardoise">
              Prêt-à-porter masculin dessiné à Paris, fabriqué en Europe et vendu en direct.
            </p>
            <a
              href="/"
              aria-label="Instagram"
              className="mt-5 inline-flex text-encre transition-opacity hover:opacity-60"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>

          {COLONNES.map((c) => (
            <div key={c.titre}>
              <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-encre">
                {c.titre}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {c.liens.map((l) => (
                  <li key={l}>
                    <a
                      href="/"
                      className="font-sans text-[13px] font-light text-ardoise transition-colors hover:text-encre"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-filet pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-[11px] font-light text-ardoise">
            © {new Date().getFullYear()} André Laurent — démonstration, marque fictive.
          </p>
          <p className="font-sans text-[11px] font-light text-ardoise">
            Livraison et retours offerts · Paiement sécurisé
          </p>
        </div>
      </div>
    </footer>
  )
}
