import Logo from './Logo'
import { WhatsAppIcon, InstagramIcon, YouTubeIcon } from './icons'

const WHATSAPP_URL = 'https://wa.me/+330670260731'

const MENU = ['Artistes', 'Galeries', 'Financement', 'Le Groupe', 'Contact', 'Presse']

export default function Footer() {
  return (
    <footer className="border-t border-gris-bordure bg-gris-clair">
      <div className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <div className="flex justify-center text-noir-bartoux">
          <Logo large />
        </div>

        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-4"
          aria-label="Navigation pied de page"
        >
          {MENU.map((item) => (
            <a
              key={item}
              href="#"
              className="font-sans text-[11px] uppercase tracking-[0.2em] text-noir-bartoux/65 transition-colors hover:text-or-bartoux"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="mt-9 flex items-center justify-center gap-6">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
          <a
            href="https://www.instagram.com/galeriesbartoux/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a
            href="https://www.youtube.com/@galeriesbartoux"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
          >
            <YouTubeIcon className="h-5 w-5" />
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gris-bordure pt-7 sm:flex-row">
          <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-gris-texte">
            © Galeries Bartoux – Tous droits réservés
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="font-sans text-[10px] uppercase tracking-[0.12em] text-gris-texte transition-colors hover:text-noir-bartoux"
            >
              Politique de cookies
            </a>
            <a
              href="#"
              className="font-sans text-[10px] uppercase tracking-[0.12em] text-gris-texte transition-colors hover:text-noir-bartoux"
            >
              Mentions légales
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
