import { useEffect } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton } from '../ui'
import { RECHERCHE_MAX, DESCRIPTION_MAX } from '../../../types/ai'
import { artistesRetenus, construireArtistesPresentes } from '../../../lib/presentation'
import { justifier } from '../../../lib/aiClient'

interface StepPresentationProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/**
 * Étape intermédiaire entre la réflexion et la sélection : présente les artistes
 * retenus avec une intro éditoriale et une phrase justifiant leur choix au
 * regard de ce que le client a décrit. La reformulation et les justifications
 * viennent de l'IA (state.justify, produite à l'étape réflexion) ; en cas
 * d'échec/absence, repli sur des justifications 100 % code (lib/presentation.ts).
 */
export default function StepPresentation({ state, dispatch }: StepPresentationProps) {
  const artistes = construireArtistesPresentes(state)
  const reformulation = state.justify.result?.reformulation?.trim() || null
  const versSelection = () => dispatch({ type: 'GOTO', step: 'results' })

  // Filet de sécurité : si l'on revient ici après avoir modifié la demande
  // (justify réinitialisé à « idle »), on relance la justification IA. Le cas
  // nominal est déjà couvert par l'étape réflexion.
  useEffect(() => {
    if (state.justify.status !== 'idle') return
    const artistesNoms = artistesRetenus(state.matches)
    if (artistesNoms.length === 0) return
    let annule = false
    const run = async () => {
      dispatch({ type: 'JUSTIFY_START' })
      const justif = await justifier({
        type: state.type ?? 'sculpture',
        recherche: state.recherche.trim().slice(0, RECHERCHE_MAX),
        description: state.description.trim().slice(0, DESCRIPTION_MAX),
        artistes: artistesNoms
      })
      if (annule) return
      dispatch(justif ? { type: 'JUSTIFY_DONE', value: justif } : { type: 'JUSTIFY_ERROR' })
    }
    void run()
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-full flex-col px-5 pb-7 pt-5">
      <StepEyebrow>Les artistes retenus</StepEyebrow>
      <Prompt>Pourquoi ces artistes vous correspondent</Prompt>
      <Subtext>
        D’après votre demande, voici les artistes que nous avons sélectionnés pour vous — et ce qui
        les relie à ce que vous recherchez.
      </Subtext>

      {/* Reformulation IA de la demande du client (si disponible) */}
      {reformulation && (
        <div className="anim-bubble mt-4 rounded-xl border border-or-bartoux/25 bg-or-bartoux/[0.06] px-4 py-3">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-or-bartoux/90">
            Votre demande
          </p>
          <p className="mt-1 font-serif text-[15px] leading-snug text-white">{reformulation}</p>
        </div>
      )}

      {artistes.length > 0 ? (
        <div className="mt-5 space-y-5">
          {artistes.map(({ artiste, oeuvre, bio, justification }) => (
            <article
              key={artiste}
              className="anim-bubble overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
            >
              {/* Visuel représentatif : œuvre montrée en entier (jamais recadrée) */}
              <div className="aspect-[3/4] w-full bg-[#0D0D0D]">
                <img src={oeuvre.image} alt={oeuvre.titre} className="h-full w-full object-contain" />
              </div>
              <div className="p-4">
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-or-bartoux">
                  {artiste}
                </p>
                {bio && (
                  <p className="mt-2 font-sans text-[13px] font-light leading-relaxed text-white/85">
                    {bio}
                  </p>
                )}
                {/* Justification mise en valeur, reliée à la demande du client */}
                <p className="mt-3 border-l-2 border-or-bartoux/60 pl-3 font-serif text-[14px] italic leading-snug text-white">
                  {justification}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 font-sans text-[13px] font-light leading-relaxed text-gris-texte">
          Nous avons réuni une sélection d’œuvres pour vous.
        </p>
      )}

      <div className="mt-auto pt-6">
        <PrimaryButton onClick={versSelection}>Découvrir les œuvres</PrimaryButton>
      </div>
    </div>
  )
}
