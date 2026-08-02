import { useEffect, useState } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { StepEyebrow } from '../ui'
import { buildMatchContext, rankCatalogue } from '../../../lib/matching'
import { detectArtistes } from '../../../lib/artistMatch'
import { artistesRetenus } from '../../../lib/presentation'
import { analyser, justifier } from '../../../lib/aiClient'
import { RECHERCHE_MAX, DESCRIPTION_MAX, type AnalyseResult } from '../../../types/ai'

interface StepMatchingProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

const delai = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Écran de progression réel : les trois lignes correspondent aux vraies phases
 * du pipeline (détection/analyse → scoring → sélection). Chaque ligne reste
 * affichée un minimum de temps pour une lecture confortable.
 */
export default function StepMatching({ state, dispatch }: StepMatchingProps) {
  const [active, setActive] = useState(0)

  const pluriel = state.type === 'sculpture' ? 'sculptures' : 'peintures'
  const lignes = [
    'Analyse de votre demande…',
    `Recherche des ${pluriel} dans la collection Bartoux…`,
    'Sélection des plus belles correspondances…',
    'Rédaction de votre sélection personnalisée…'
  ]

  useEffect(() => {
    // Le double montage StrictMode relance simplement le pipeline : le flag
    // `annule` neutralise le premier passage et aiClient déduplique les appels.
    let annule = false

    const run = async () => {
      // ① Détection d'artiste en pur code, puis analyse IA seulement si utile :
      // photo à interpréter, ou texte libre sans artiste identifié. Le chemin
      // « artiste nommé, pas de photo » ne coûte aucun appel réseau.
      const recherche = state.recherche.trim().slice(0, RECHERCHE_MAX)
      const description = state.description.trim().slice(0, DESCRIPTION_MAX)
      const artistesCode = detectArtistes(recherche)
      const besoinIA =
        state.photo !== null || (recherche.length > 0 && artistesCode.length === 0)

      let analyse: AnalyseResult | null = null
      if (besoinIA) {
        dispatch({ type: 'ANALYSE_START' })
        const [resultat] = await Promise.all([
          analyser({
            type: state.type ?? 'sculpture',
            recherche,
            description,
            photo: state.photo
          }),
          delai(850)
        ])
        if (annule) return
        analyse = resultat
        dispatch(resultat ? { type: 'ANALYSE_DONE', value: resultat } : { type: 'ANALYSE_ERROR' })
      } else {
        dispatch({ type: 'ANALYSE_SKIP' })
        await delai(850)
        if (annule) return
      }
      setActive(1)

      // ② Scoring du catalogue (0 appel réseau).
      const ctx = buildMatchContext(state, analyse)
      await delai(850)
      if (annule) return
      setActive(2)

      // ③ Classement final.
      const matches = rankCatalogue(ctx)
      await delai(500)
      if (annule) return
      dispatch({ type: 'SET_MATCHES', value: matches })

      // ④ Justification IA des artistes retenus (reformulation + une phrase par
      // artiste). Échec ou clé absente → repli sur les justifications code
      // (construireArtistesPresentes), l'écran reste opérationnel.
      setActive(3)
      const artistes = artistesRetenus(matches)
      if (artistes.length > 0) {
        dispatch({ type: 'JUSTIFY_START' })
        const [justif] = await Promise.all([
          justifier({ type: state.type ?? 'sculpture', recherche, description, artistes }),
          delai(600)
        ])
        if (annule) return
        dispatch(justif ? { type: 'JUSTIFY_DONE', value: justif } : { type: 'JUSTIFY_ERROR' })
      } else {
        dispatch({ type: 'JUSTIFY_SKIP' })
        await delai(400)
        if (annule) return
      }

      dispatch({ type: 'GOTO', step: 'presentation' })
    }
    void run()
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-full flex-col justify-center p-6">
      <StepEyebrow>Sélection en cours</StepEyebrow>

      <div className="space-y-5">
        {lignes.map((ligne, i) => {
          const done = i < active
          const current = i === active
          return (
            <div
              key={ligne}
              className="flex items-center gap-3 transition-opacity duration-500"
              style={{ opacity: i <= active ? 1 : 0.4 }}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full bg-or-bartoux ${current ? 'anim-pulse-dot' : ''}`}
                style={{ opacity: done || current ? 1 : 0.5 }}
              />
              <span className="font-sans text-[14px] font-light text-white">{ligne}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
