import { useEffect, useRef, useState } from 'react'
import type { WidgetState } from '../../../types'
import type { RenderArticle } from '../../../types/ai'
import type { WidgetDispatch } from '../state'
import { cleRendu } from '../state'
import { StepEyebrow, PrimaryButton, SecondaryButton, VignetteArticle } from '../ui'
import { DownloadIcon } from '../../icons'
import Logo from '../../Logo'
import { formatPrix } from '../../../data/catalogue'
import { downscaleDataUrl, versJpegBlob } from '../../../lib/image'
import { composerPlanche } from '../../../lib/planche'
import { totalTenue } from '../../../lib/tenue'
import { intentionCourante } from '../../../lib/intent'
import { briefCode } from '../../../lib/brief'
import { rendre } from '../../../lib/aiClient'
import { RENDER_ARTICLES_MAX } from '../../../types/ai'

interface StepRenderProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

export default function StepRender({ state, dispatch }: StepRenderProps) {
  // Planche « flat lay » : affichée sans photo, et en secours si le rendu échoue.
  const [planche, setPlanche] = useState<string | null>(null)
  // Fichier JPG pré-calculé : prêt AVANT le clic pour que le partage natif iOS
  // (« Enregistrer l'image » → pellicule) reste dans le geste utilisateur.
  const [fichierJpg, setFichierJpg] = useState<File | null>(null)
  const lanceRef = useRef<string | null>(null)

  const tenue = state.tenue
  const renderAI = state.renderAI
  const imageIA = renderAI.status === 'done' ? renderAI.image : null
  const avecPhoto = state.photo !== null
  const enCours = avecPhoto && (renderAI.status === 'idle' || renderAI.status === 'pending')
  const visuel = imageIA ?? planche

  // Essayage : la photo ORIGINALE + un visuel par pièce + un prompt d'édition.
  // Le modèle remplace lui-même les vêtements correspondants. Repli sur la
  // planche si l'appel échoue — la photo du visiteur n'est alors pas altérée.
  useEffect(() => {
    if (!state.photo || tenue.length === 0 || renderAI.status !== 'idle') return
    const cle = cleRendu(state)
    if (lanceRef.current === cle) return
    lanceRef.current = cle

    const photo = state.photo
    const intention = intentionCourante(state)
    const run = async () => {
      dispatch({ type: 'RENDER_AI_START' })
      try {
        const visuels = await Promise.all(
          tenue.slice(0, RENDER_ARTICLES_MAX).map(async (a): Promise<RenderArticle> => {
            const reduit = await downscaleDataUrl(a.image, 768)
            return { image: reduit.dataUrl, slots: a.slots, description: a.descriptionRendu }
          })
        )
        const rendu = await rendre({
          photo,
          articles: visuels,
          notes: briefCode(intention, state.demande).reformulation
        })
        if (rendu) {
          dispatch({ type: 'RENDER_AI_DONE', value: rendu, cle })
          return
        }
        dispatch({ type: 'RENDER_AI_ERROR', cle })
      } catch {
        dispatch({ type: 'RENDER_AI_ERROR', cle })
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.photo, renderAI.status, tenue])

  // La planche est composée dès qu'elle peut servir : sans photo, ou en secours.
  useEffect(() => {
    if (tenue.length === 0) return
    if (avecPhoto && renderAI.status !== 'error') return
    let annule = false
    const sousTitre = state.demande.trim() || 'Votre tenue'
    composerPlanche(tenue, sousTitre)
      .then((url) => {
        if (!annule) setPlanche(url)
      })
      .catch(() => {
        if (!annule) setPlanche(null)
      })
    return () => {
      annule = true
    }
  }, [tenue, avecPhoto, renderAI.status, state.demande])

  // Prépare le fichier JPG du visuel final pour un partage instantané au clic.
  useEffect(() => {
    if (!visuel) {
      setFichierJpg(null)
      return
    }
    let annule = false
    versJpegBlob(visuel)
      .then((blob) => {
        if (!annule) {
          setFichierJpg(new File([blob], 'andre-laurent-essayage.jpg', { type: 'image/jpeg' }))
        }
      })
      .catch(() => {
        if (!annule) setFichierJpg(null)
      })
    return () => {
      annule = true
    }
  }, [visuel])

  if (tenue.length === 0) return null

  const relancer = () => {
    lanceRef.current = null // sans cela, l'effet considérerait le rendu déjà lancé
    dispatch({ type: 'RENDER_AI_RESET' })
  }

  const declencherTelechargement = (url: string, nom: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = nom
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const telecharger = async () => {
    const nav = navigator as unknown as {
      share?: (data: { files?: File[]; title?: string }) => Promise<void>
      canShare?: (data: { files?: File[] }) => boolean
    }
    const surMobile =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

    // Mobile : le partage natif range le JPG dans la pellicule (impossible via
    // un simple téléchargement sur iOS). On n'y va que si le fichier est prêt.
    if (surMobile && fichierJpg && nav.share && nav.canShare?.({ files: [fichierJpg] })) {
      try {
        await nav.share({ files: [fichierJpg], title: 'Ma tenue André Laurent' })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return // partage annulé
        // autre erreur → repli sur le téléchargement fichier ci-dessous
      }
    }

    let blob: Blob | null = fichierJpg
    if (!blob) {
      if (!visuel) return
      try {
        blob = await versJpegBlob(visuel)
      } catch {
        declencherTelechargement(visuel, 'andre-laurent-essayage.png')
        return
      }
    }
    const url = URL.createObjectURL(blob)
    declencherTelechargement(url, 'andre-laurent-essayage.jpg')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>{avecPhoto ? 'Votre essayage' : 'Votre tenue'}</StepEyebrow>

      <div className="mx-auto w-fit max-w-full">
        <div className="anim-art-reveal relative overflow-hidden border border-filet bg-blanc">
          {enCours ? (
            <div
              className="flex flex-col items-center justify-center bg-blanc px-6 text-center"
              style={{ height: 320, width: 320, maxWidth: '100%' }}
            >
              <Logo large className="text-encre" />
              <span className="mt-7 h-7 w-7 animate-spin rounded-full border-2 border-filet border-t-bordeaux" />
              <p className="mt-4 font-sans text-[11px] font-light uppercase tracking-[0.16em] text-encre/70">
                Essayage en cours…
              </p>
            </div>
          ) : visuel ? (
            <img
              src={visuel}
              alt={avecPhoto ? 'Vous, habillé de votre tenue' : 'Planche de votre tenue'}
              className="anim-art-reveal mx-auto block max-h-[340px] w-auto max-w-full align-top"
            />
          ) : (
            /* Composition de la planche en cours (canvas) */
            <div
              className="flex items-center justify-center bg-craie"
              style={{ height: 320, width: 280, maxWidth: '100%' }}
            >
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-filet border-t-bordeaux" />
            </div>
          )}

          {!enCours && visuel && (
            <button
              type="button"
              onClick={() => void telecharger()}
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-encre/75 py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-sm transition-colors hover:bg-encre/90"
            >
              <DownloadIcon className="h-4 w-4" />
              Télécharger
            </button>
          )}
        </div>
      </div>

      {renderAI.status === 'error' && avecPhoto && (
        <p className="mt-2 text-center font-sans text-[11px] font-light text-ardoise">
          Essayage indisponible — voici la planche de votre tenue.{' '}
          <button
            type="button"
            onClick={relancer}
            className="text-bordeaux underline underline-offset-2 hover:text-encre"
          >
            Réessayer
          </button>
        </p>
      )}

      {/* Rappel de la composition */}
      <div className="mt-4 border border-filet bg-blanc p-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {tenue.map((a) => (
            <VignetteArticle key={a.id} article={a} taille={44} />
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-ardoise">
            {tenue.length} pièce{tenue.length > 1 ? 's' : ''}
          </span>
          <span className="font-serif text-[17px] text-encre">{formatPrix(totalTenue(tenue))}</span>
        </div>
        {imageIA && (
          <p className="mt-1.5 font-sans text-[10px] font-light italic text-ardoise/80">
            Essayage généré à titre indicatif — les proportions réelles peuvent différer.
          </p>
        )}
      </div>

      <div className="mt-auto space-y-3 pt-5">
        <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'lead' })}>
          Recevoir ma tenue par e-mail
        </PrimaryButton>
        <SecondaryButton onClick={() => dispatch({ type: 'GOTO', step: 'outfit' })}>
          ← Modifier ma tenue
        </SecondaryButton>
      </div>
    </div>
  )
}
