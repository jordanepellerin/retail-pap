import { useState } from 'react'
import Logo from './Logo'
import {
  WhatsAppIcon,
  InstagramIcon,
  YouTubeIcon,
  SearchIcon,
  MenuIcon,
  CloseIcon
} from './icons'

const WHATSAPP_URL = 'https://wa.me/+330670260731'

const LINKS: { label: string; href: string }[] = [
  { label: 'Artistes', href: '#' },
  { label: 'Galeries', href: '#' },
  { label: 'Expositions', href: '#expositions' },
  { label: 'Actualités', href: '#actualites' },
  { label: 'Le Groupe', href: '#histoire' },
  { label: 'Contact', href: '#contact' }
]

function Social({ size = 'h-[17px] w-[17px]' }: { size?: string }) {
  return (
    <div className="flex items-center gap-4">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
      >
        <WhatsAppIcon className={size} />
      </a>
      <a
        href="https://www.instagram.com/galeriesbartoux/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
      >
        <InstagramIcon className={size} />
      </a>
      <a
        href="https://www.youtube.com/@galeriesbartoux"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube"
        className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
      >
        <YouTubeIcon className={size} />
      </a>
    </div>
  )
}

function LangSwitch() {
  return (
    <div className="font-sans text-[11px] tracking-[0.15em] text-noir-bartoux/55">
      <span className="text-or-bartoux">FR</span>
      <span className="mx-1.5 text-noir-bartoux/25">/</span>
      <span className="cursor-pointer transition-colors hover:text-noir-bartoux">EN</span>
    </div>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-gris-bordure bg-white">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        {/* Rangée logo — centré */}
        <div className="relative flex items-center justify-center py-5">
          {/* Utilitaires — desktop, à droite */}
          <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-4 lg:flex">
            <button
              type="button"
              aria-label="Rechercher"
              className="text-noir-bartoux/55 transition-colors hover:text-or-bartoux"
            >
              <SearchIcon className="h-[17px] w-[17px]" />
            </button>
            <span className="h-4 w-px bg-gris-bordure" />
            <Social />
            <span className="h-4 w-px bg-gris-bordure" />
            <LangSwitch />
          </div>

          {/* Hamburger — mobile, à droite */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-noir-bartoux lg:hidden"
          >
            {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>

          <a href="#top" aria-label="Galeries Bartoux — accueil">
            <Logo large className="text-noir-bartoux" />
          </a>
        </div>

        {/* Rangée menu — centrée, desktop */}
        <nav
          className="hidden items-center justify-center gap-8 border-t border-gris-bordure/70 py-3.5 lg:flex"
          aria-label="Navigation principale"
        >
          {LINKS.map((l) => (
            <a key={l.label} href={l.href} className="nav-link">
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="border-t border-gris-bordure bg-white px-5 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="Navigation mobile">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="nav-link border-b border-gris-bordure/60 py-4 text-[13px]"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-6 flex items-center justify-between">
            <Social size="h-5 w-5" />
            <LangSwitch />
          </div>
        </div>
      )}
    </header>
  )
}
