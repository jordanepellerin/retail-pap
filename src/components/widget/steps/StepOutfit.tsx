import { useState } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import {
  Prompt,
  Subtext,
  StepEyebrow,
  PrimaryButton,
  SecondaryButton,
  VignetteArticle,
  LigneArticle
} from '../ui'
import { formatPrix } from '../../../data/catalogue'
import { alertesTenue, resumeSlots, totalTenue } from '../../../lib/tenue'

interface StepOutfitProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/**
 * Dernier écran avant la génération : ce que le visiteur va porter, ce que ça
 * coûte, ce que l'IA va remplacer sur sa photo — et une confirmation explicite.
 * Générer coûte une vingtaine de secondes et un appel payant : on ne le déclenche
 * jamais d'un clic distrait.
 */
export default function StepOutfit({ state, dispatch }: StepOutfitProps) {
  const [confirmation, setConfirmation] = useState(false)
  const tenue = state.tenue
  const nb = tenue.length
  const alertes = alertesTenue(tenue)
  const cibles = resumeSlots(tenue)

  return (
    <div className="flex min-h-full flex-col px-5 pb-7 pt-5">
      <StepEyebrow>Votre tenue</StepEyebrow>
      <Prompt>
        {nb === 0
          ? 'Votre tenue est vide'
          : `${nb} pièce${nb > 1 ? 's' : ''} prête${nb > 1 ? 's' : ''} à essayer`}
      </Prompt>
      <Subtext>
        {nb === 0
          ? 'Revenez à la sélection pour retenir au moins une pièce.'
          : state.photo
            ? `Je remplace sur votre photo : ${cibles}. Le reste de la photo ne bouge pas.`
            : 'Sans photo, je vous prépare une planche de votre tenue plutôt qu’un essayage.'}
      </Subtext>

      {nb > 0 && (
        <ul className="mt-5 divide-y divide-white/8 border-y border-white/10">
          {tenue.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <VignetteArticle article={a} taille={48} />
              <LigneArticle article={a} />
              <button
                type="button"
                onClick={() => dispatch({ type: 'RETIRER_ARTICLE', id: a.id })}
                aria-label={`Retirer ${a.nom}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/15 text-[14px] text-gris-texte transition-colors hover:border-white/40 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {nb > 0 && (
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-gris-texte">
            Total
          </span>
          <span className="font-serif text-[19px] text-white">{formatPrix(totalTenue(tenue))}</span>
        </div>
      )}

      {/* Avertissements doux : ils informent, ils ne bloquent jamais. */}
      {alertes.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {alertes.map((a) => (
            <li
              key={a}
              className="border-l-2 border-sable/60 pl-3 font-sans text-[12px] font-light leading-relaxed text-white/70"
            >
              {a}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto space-y-3 pt-7">
        {confirmation ? (
          <div className="anim-bubble border border-sable/40 bg-sable/[0.07] p-4">
            <p className="font-serif text-[15px] leading-snug text-white">
              Je lance la génération avec {nb} pièce{nb > 1 ? 's' : ''}&nbsp;?
            </p>
            <p className="mt-1.5 font-sans text-[12px] font-light leading-relaxed text-white/70">
              Comptez une vingtaine de secondes. Vous pourrez revenir modifier votre tenue ensuite.
            </p>
            <div className="mt-4 space-y-2.5">
              <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'render' })}>
                Oui, générer
              </PrimaryButton>
              <SecondaryButton onClick={() => setConfirmation(false)}>
                Modifier ma tenue
              </SecondaryButton>
            </div>
          </div>
        ) : (
          <>
            <PrimaryButton onClick={() => setConfirmation(true)} disabled={nb === 0}>
              {nb === 0 ? 'Aucune pièce sélectionnée' : 'Voir le résultat'}
            </PrimaryButton>
            <SecondaryButton onClick={() => dispatch({ type: 'GOTO', step: 'selection' })}>
              ← Ajouter ou changer une pièce
            </SecondaryButton>
          </>
        )}
      </div>
    </div>
  )
}
