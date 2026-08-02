import { useState } from 'react'
import { WhatsAppIcon } from './icons'

const WHATSAPP_BASE = 'https://wa.me/+330670260731'

export default function BandeauWhatsApp() {
  const [msg, setMsg] = useState('')
  const href = `${WHATSAPP_BASE}?text=${encodeURIComponent(
    msg.trim() || 'Bonjour, je souhaite des informations sur une œuvre.'
  )}`

  return (
    <section id="contact" className="border-t border-gris-bordure bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <WhatsAppIcon className="mx-auto h-9 w-9 text-[#25D366]" />
        <h2 className="section-title mt-5 text-[26px] text-noir-bartoux sm:text-[34px]">
          Contactez-nous sur WhatsApp
        </h2>
        <p className="mt-3 font-sans text-[15px] font-light text-gris-texte">
          Discutons ensemble de votre projet.
        </p>

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Votre message…"
            aria-label="Votre message"
            className="w-full rounded-sm border border-gris-bordure bg-white px-4 py-3.5 font-sans text-[14px] text-noir-bartoux outline-none transition-colors placeholder:text-gris-texte/70 focus:border-or-bartoux"
          />
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-[#25D366] px-7 py-3.5 text-white hover:brightness-95"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Contactez-nous
          </a>
        </div>
      </div>
    </section>
  )
}
