import { useState, type ChangeEvent } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { Prompt, Subtext, StepEyebrow, PrimaryButton, SecondaryButton } from '../ui'
import { downscaleDataUrl } from '../../../lib/image'

// Intérieur d'exemple (mur avec emplacement vide) servi localement depuis public/.
const EXEMPLE_IMAGE = '/exemple-salon.svg'

interface StepPhotoProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

export default function StepPhoto({ state, dispatch }: StepPhotoProps) {
  const [erreur, setErreur] = useState(false)

  // Toute photo (upload ou exemple SVG) est réduite ≤ 1280 px et ré-encodée en
  // JPEG avant stockage : payload API léger, dimensions connues pour l'échelle.
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
      <StepEyebrow>Votre espace · facultatif</StepEyebrow>
      <Prompt>Ajoutez une photo de votre espace</Prompt>
      <Subtext>J'y intègre les œuvres de votre sélection pour un rendu réaliste en situation.</Subtext>

      <div className="mt-5 space-y-3">
        {state.photo ? (
          <div className="overflow-hidden rounded-xl border border-or-bartoux/30 bg-black">
            <img
              src={state.photo}
              alt="Aperçu de votre espace"
              className="mx-auto max-h-[320px] w-full object-contain"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PHOTO', value: null })}
              className="w-full bg-[#1A1A1A] py-2 font-sans text-[11px] uppercase tracking-[0.12em] text-gris-texte transition-colors hover:text-white"
            >
              Changer la photo
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-or-bartoux/40 bg-white/[0.02] px-6 py-8 text-center transition-colors hover:border-or-bartoux/70 hover:bg-white/[0.04]">
            <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-or-bartoux/50 text-[18px] text-or-bartoux">
              ↑
            </span>
            <span className="mt-3 font-sans text-[14px] font-medium text-white">Choisir une photo</span>
            <span className="mt-1 font-sans text-[11px] font-light text-gris-texte">
              JPG, PNG · Votre photo reste privée
            </span>
          </label>
        )}

        {erreur && (
          <p className="text-center font-sans text-[12px] font-light text-red-300">
            Cette image n'a pas pu être lue — essayez un JPG ou un PNG.
          </p>
        )}

        {/* Description libre (aide à la mise à l'échelle) */}
        <textarea
          className="field-area"
          rows={3}
          maxLength={500}
          placeholder="Où placer l'œuvre ? (ex. au-dessus du canapé du salon). Une dimension repère — largeur du canapé, hauteur du mur — aide à la mise à l'échelle. Facultatif."
          value={state.description}
          onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', value: e.target.value })}
        />

        {!state.photo && (
          <button
            type="button"
            onClick={() => void integrer(EXEMPLE_IMAGE)}
            className="w-full text-center font-sans text-[12px] font-light text-gris-texte underline-offset-4 transition-colors hover:text-or-bartoux hover:underline"
          >
            Pas de photo ? Essayer avec un intérieur d'exemple →
          </button>
        )}
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <PrimaryButton
          onClick={() =>
            dispatch(state.photo ? { type: 'GOTO', step: 'render' } : { type: 'SKIP_PHOTO' })
          }
        >
          {state.photo ? 'Voir le rendu chez moi' : 'Continuer'}
        </PrimaryButton>
        <SecondaryButton onClick={() => dispatch({ type: 'SKIP_PHOTO' })}>
          Ignorer cette étape
        </SecondaryButton>
      </div>
    </div>
  )
}
