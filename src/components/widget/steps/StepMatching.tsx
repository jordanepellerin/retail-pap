import { useEffect, useState } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { StepEyebrow } from '../ui'
import { besoinAnalyseIA, detecterIntention, fusionner } from '../../../lib/intent'
import { appliquerReponses } from '../../../data/questions'
import { classerArticles, categoriesDemandees } from '../../../lib/matching'
import { criteres } from '../../../lib/brief'
import { analyser, reformuler } from '../../../lib/aiClient'
import { DEMANDE_MAX } from '../../../types/ai'

interface StepMatchingProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

const delai = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const LIGNES = [
  'Lecture de votre demande…',
  'Recherche dans la collection…',
  'Classement des pièces les plus proches…',
  'Rédaction de ma compréhension…'
]

/**
 * Écran de progression réel : chaque ligne correspond à une vraie phase du
 * pipeline. Tout ce qui peut se faire en code se fait en code ; l'IA n'est
 * appelée que pour ce qu'elle seule sait faire (lire une demande en langage
 * naturel, puis la reformuler).
 */
export default function StepMatching({ state, dispatch }: StepMatchingProps) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    // Le double montage StrictMode relance simplement le pipeline : le flag
    // `annule` neutralise le premier passage et aiClient déduplique les appels.
    let annule = false

    const run = async () => {
      const demande = state.demande.trim().slice(0, DEMANDE_MAX)

      // ① Intention en pur code, puis analyse IA seulement si elle apporte
      // quelque chose (demande que le code n'a pas su lire entièrement).
      const codeIntention = detecterIntention(demande)
      let intention = appliquerReponses(codeIntention, state.reponses)

      if (besoinAnalyseIA(demande, codeIntention)) {
        dispatch({ type: 'ANALYSE_START' })
        const [resultat] = await Promise.all([analyser({ demande }), delai(800)])
        if (annule) return
        if (resultat) {
          // Les réponses de l'utilisateur restent prioritaires sur l'IA.
          intention = appliquerReponses(fusionner(codeIntention, resultat.intent), state.reponses)
        }
      } else {
        await delai(700)
        if (annule) return
      }
      setActive(1)

      // ② Classement du catalogue (0 appel réseau).
      await delai(700)
      if (annule) return
      setActive(2)
      const matches = classerArticles(intention)
      await delai(500)
      if (annule) return
      dispatch({ type: 'SET_MATCHES', value: matches })
      // L'intention consolidée devient la source de vérité de l'aval.
      dispatch({ type: 'ANALYSE_DONE', value: { intent: intention, confiance: 1 } })

      // ③ Reformulation IA. Échec ou clé absente → repli 100 % code
      // (`briefCode`), l'écran suivant reste opérationnel.
      setActive(3)
      dispatch({ type: 'BRIEF_START' })
      const [brief] = await Promise.all([
        reformuler({
          demande,
          criteres: criteres(intention).map((c) => c.label),
          categories: categoriesDemandees(intention)
        }),
        delai(600)
      ])
      if (annule) return
      dispatch(brief ? { type: 'BRIEF_DONE', value: brief } : { type: 'BRIEF_ERROR' })
      dispatch({ type: 'GOTO', step: 'brief' })
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
        {LIGNES.map((ligne, i) => {
          const done = i < active
          const current = i === active
          return (
            <div
              key={ligne}
              className="flex items-center gap-3 transition-opacity duration-500"
              style={{ opacity: i <= active ? 1 : 0.4 }}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full bg-bordeaux ${current ? 'anim-pulse-dot' : ''}`}
                style={{ opacity: done || current ? 1 : 0.5 }}
              />
              <span className="font-sans text-[14px] font-light text-encre">{ligne}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
