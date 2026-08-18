import { useState, type ChangeEvent } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton, SecondaryButton } from '../ui'
import { downscaleDataUrl } from '../../../lib/image'

// Silhouette d'exemple servie localement (public/exemples/), pour tester le
// parcours sans se photographier.
const EXEMPLE_IMAGE = '/exemples/mannequin.svg'

interface StepPhotoProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

export default function StepPhoto({ state, dispatch }: StepPhotoProps) {
  const [erreur, setErreur] = useState(false)

  // Toute photo (upload ou exemple SVG) est réduite ≤ 1280 px et ré-encodée en
  // JPEG avant stockage : payload API léger, et les modèles refusent le SVG.
  const integrer = async (src: string) => {
    setErreur(false)
    try {
      const { dataUrl, w, h } = await downscaleDataUrl(src)
      dispatch({ type: 'SET_PHOTO', value: { dataUrl, meta: { w, h } } })
    } catch {
      setErreur(true)
    }
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void integrer(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>Votre essayage</StepEyebrow>
      <Prompt>Ajoutez une photo de vous</Prompt>
      <Subtext>
        De face, en pied ou à mi-corps, sur un fond dégagé : c’est ce qui donne le meilleur
        résultat. Je remplace vos vêtements par les pièces retenues — votre visage et le décor ne
        changent pas.
      </Subtext>

      <div className="mt-5 space-y-3">
        {state.photo ? (
          <div className="overflow-hidden border border-gris-bordure bg-gris-clair">
            <img
              src={state.photo}
              alt="Aperçu de votre photo"
              className="mx-auto max-h-[320px] w-full object-contain"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PHOTO', value: null })}
              className="w-full border-t border-gris-bordure bg-blanc-pur py-2 font-sans text-[11px] uppercase tracking-[0.14em] text-gris-texte transition-colors hover:text-noir-encre"
            >
              Changer la photo
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gris-bordure bg-gris-clair px-6 py-9 text-center transition-colors hover:border-noir-encre">
            <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-noir-encre text-[18px] text-noir-encre">
              ↑
            </span>
            <span className="mt-3 font-sans text-[14px] font-medium text-noir-encre">
              Choisir une photo
            </span>
            <span className="mt-1 font-sans text-[11px] font-light text-gris-texte">
              JPG, PNG · Votre photo reste privée
            </span>
          </label>
        )}

        {erreur && (
          <p className="text-center font-sans text-[12px] font-light text-red-300">
            Cette image n’a pas pu être lue — essayez un JPG ou un PNG.
          </p>
        )}

        {!state.photo && (
          <button
            type="button"
            onClick={() => void integrer(EXEMPLE_IMAGE)}
            className="w-full text-center font-sans text-[12px] font-light text-gris-texte underline-offset-4 transition-colors hover:text-noir-encre hover:underline"
          >
            Pas de photo sous la main ? Essayer sur une silhouette →
          </button>
        )}
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <PrimaryButton
          onClick={() =>
            dispatch(state.photo ? { type: 'GOTO', step: 'outfit' } : { type: 'SKIP_PHOTO' })
          }
        >
          Continuer
        </PrimaryButton>
        <SecondaryButton onClick={() => dispatch({ type: 'SKIP_PHOTO' })}>
          Continuer sans photo
        </SecondaryButton>
      </div>
    </div>
  )
}
