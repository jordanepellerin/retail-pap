import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import AdminPrompts from './pages/AdminPrompts'
import Nav from './components/Nav'
import HeroSlider from './components/HeroSlider'
import DecouvrezArtistes from './components/DecouvrezArtistes'
import CoupsDeCoeur from './components/CoupsDeCoeur'
import Expositions from './components/Expositions'
import Nouveau from './components/Nouveau'
import Actualites from './components/Actualites'
import Histoire from './components/Histoire'
import BandeauWhatsApp from './components/BandeauWhatsApp'
import Footer from './components/Footer'
import Widget from './components/widget/Widget'

interface LandingPageProps {
  onOpenWidget: () => void
}

function LandingPage({ onOpenWidget }: LandingPageProps) {
  return (
    <>
      <Nav />
      <main>
        <HeroSlider onOpenWidget={onOpenWidget} />
        <DecouvrezArtistes onOpenWidget={onOpenWidget} />
        <CoupsDeCoeur />
        <Expositions />
        <Nouveau />
        <Actualites />
        <Histoire />
        <BandeauWhatsApp />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  // L'état d'ouverture du widget est remonté au niveau App : il est déclenché
  // par le bouton flottant, le slide « Trouver mon œuvre » du hero et la section
  // « Découvrez nos artistes ».
  const [widgetOpen, setWidgetOpen] = useState(false)
  const openWidget = () => setWidgetOpen(true)
  // Outil interne : pas de bouton widget flottant sur la page d'administration.
  const surAdmin = useLocation().pathname.startsWith('/admin')

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage onOpenWidget={openWidget} />} />
        <Route path="/admin" element={<AdminPrompts />} />
        <Route path="*" element={<LandingPage onOpenWidget={openWidget} />} />
      </Routes>

      {/* Widget conseiller (bouton flottant en bas à droite). Le WhatsApp reste
          dans le bandeau dédié et le footer — plus de bouton flottant. */}
      {!surAdmin && <Widget open={widgetOpen} setOpen={setWidgetOpen} />}
    </>
  )
}
