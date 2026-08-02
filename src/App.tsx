import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import AdminPrompts from './pages/AdminPrompts'
import Nav from './components/Nav'
import CategoryHero from './components/CategoryHero'
import ProductGrid from './components/ProductGrid'
import Services from './components/Services'
import Footer from './components/Footer'
import Widget from './components/widget/Widget'

interface BoutiqueProps {
  onOpenWidget: () => void
}

/** Page catégorie « Costumes » — le contexte dans lequel le widget est testé. */
function Boutique({ onOpenWidget }: BoutiqueProps) {
  return (
    <>
      <Nav />
      <main>
        <CategoryHero />
        <ProductGrid />
        <Services onOpenWidget={onOpenWidget} />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  // L'état d'ouverture du widget est remonté au niveau App : il est déclenché
  // par le bouton flottant et par la section « Conseiller de style ».
  const [widgetOpen, setWidgetOpen] = useState(false)
  const openWidget = () => setWidgetOpen(true)
  // Outil interne : pas de bouton widget flottant sur la page d'administration.
  const surAdmin = useLocation().pathname.startsWith('/admin')

  return (
    <>
      <Routes>
        <Route path="/" element={<Boutique onOpenWidget={openWidget} />} />
        <Route path="/admin" element={<AdminPrompts />} />
        <Route path="*" element={<Boutique onOpenWidget={openWidget} />} />
      </Routes>

      {!surAdmin && <Widget open={widgetOpen} setOpen={setWidgetOpen} />}
    </>
  )
}
