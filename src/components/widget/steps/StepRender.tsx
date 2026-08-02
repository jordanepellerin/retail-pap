import { useEffect, useRef, useState } from 'react'
import type { WidgetState } from '../../../types'
import type { WidgetDispatch } from '../state'
import { StepEyebrow, PrimaryButton, SecondaryButton } from '../ui'
import { DownloadIcon } from '../../icons'
import Logo from '../../Logo'
import { drawGradientRect } from '../../../lib/gradient'
import { rectPourOeuvre, quadPourOeuvre } from '../../../lib/placement'
import { composerScene, composerPerspective } from '../../../lib/composite'
import { downscaleDataUrl, versJpegBlob } from '../../../lib/image'
import { rendre, analyser } from '../../../lib/aiClient'

interface StepRenderProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

export default function StepRender({ state, dispatch }: StepRenderProps) {
  const [imgFailed, setImgFailed] = useState(false)
  // Fichier JPG pré-calculé du rendu IA : prêt AVANT le clic pour que le partage
  // natif iOS (« Enregistrer l'image » → pellicule) reste dans le geste utilisateur.
  const [fichierJpg, setFichierJpg] = useState<File | null>(null)
  const lanceRef = useRef<string | null>(null)

  const oeuvre = state.selected
  const hasPhoto = !!state.photo && !imgFailed
  const placement = oeuvre
    ? rectPourOeuvre(state.analyse, oeuvre, state.photoMeta?.w ?? 0, state.photoMeta?.h ?? 0)
    : null
  const rect = placement?.rect ?? null
  const renderAI = state.renderAI
  const imageIA = renderAI.status === 'done' ? renderAI.image : null
  const estPeinture = oeuvre?.tag === 'peinture'
  // Le rendu IA est en cours tant qu'il n'a pas abouti ou échoué : on masque
  // alors l'aperçu et on n'affiche que l'écran de chargement de marque.
  const enCours = hasPhoto && (renderAI.status === 'idle' || renderAI.status === 'pending')
  const multi = state.selection.length > 1

  // Au montage (ou après retrait de l'œuvre visualisée), caler la visualisation
  // sur la première œuvre de la sélection tant qu'aucune n'est active.
  useEffect(() => {
    if (!state.selected && state.selection.length > 0) {
      dispatch({ type: 'SELECT', value: state.selection[0] })
    }
  }, [state.selected, state.selection, dispatch])

  // Rendu Nano Banana Pro : on envoie la photo ORIGINALE + l'œuvre seule + un
  // prompt de placement (emplacement libre du client, largeur du mur, dimensions
  // réelles). Le modèle place, met à l'échelle, redresse et éclaire lui-même
  // l'œuvre. Repli sur la composition code (œuvre exacte en perspective) si l'IA
  // échoue — la photo d'origine reste alors intacte.
  useEffect(() => {
    if (!oeuvre || !state.photo || renderAI.status !== 'idle') return
    if (lanceRef.current === oeuvre.id) return
    lanceRef.current = oeuvre.id

    const art = oeuvre
    const photo = state.photo
    const meta = { w: state.photoMeta?.w ?? 0, h: state.photoMeta?.h ?? 0 }
    const run = async () => {
      dispatch({ type: 'RENDER_AI_START' })
      try {
        // La sélection s'est faite AVANT l'upload de la photo : on analyse donc
        // ici la photo (placement, échelle, lumière) si ce n'est pas déjà fait,
        // sous le même écran de chargement que le rendu.
        let analyse = state.analyse
        if (!analyse?.photo) {
          const a = await analyser({
            type: state.type ?? 'sculpture',
            recherche: state.recherche,
            description: state.description,
            photo
          })
          if (a) {
            analyse = a
            dispatch({ type: 'ANALYSE_DONE', value: a })
          }
        }

        const notes = analyse?.photo?.lumiere ?? ''
        const { quad } = quadPourOeuvre(analyse, art, meta.w, meta.h)
        // Taille cible calculée par le code : envoyée comme contrainte chiffrée
        // seulement si l'échelle est fiable (px/cm déduit d'un repère mesuré).
        const cible = rectPourOeuvre(analyse, art, meta.w, meta.h)
        const echelleFiable = cible.source === 'echelle'
        // Emplacement : les mots du client priment, sinon le libellé de zone.
        const emplacement = state.description.trim() || analyse?.photo?.zones[0]?.label || ''
        const planLargeurCm = analyse?.photo?.planLargeurCm ?? null

        const artwork = await downscaleDataUrl(art.image, 768)
        const rendu = await rendre({
          photo,
          artwork: artwork.dataUrl,
          kind: art.tag,
          placement: emplacement,
          planLargeurCm,
          hauteurCm: art.dims.h,
          largeurCm: art.dims.l,
          cibleHauteurPct: echelleFiable ? cible.rect.h : null,
          cibleLargeurPct: echelleFiable ? cible.rect.w : null,
          notes
        })
        if (rendu) {
          dispatch({ type: 'RENDER_AI_DONE', value: rendu, oeuvreId: art.id })
          return
        }
        // Repli : composition code (œuvre exacte en perspective, avec ombre).
        const secours = await composerPerspective(photo, art, quad, true)
        dispatch({ type: 'RENDER_AI_DONE', value: secours, oeuvreId: art.id })
      } catch {
        dispatch({ type: 'RENDER_AI_ERROR', oeuvreId: art.id })
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oeuvre?.id, state.photo, renderAI.status])

  // Prépare le fichier JPG du rendu IA dès qu'il est disponible (conversion
  // canvas), pour un téléchargement/partage instantané au clic.
  useEffect(() => {
    if (!imageIA || !oeuvre) {
      setFichierJpg(null)
      return
    }
    let annule = false
    versJpegBlob(imageIA)
      .then((blob) => {
        if (!annule) setFichierJpg(new File([blob], `rendu-bartoux-${oeuvre.id}.jpg`, { type: 'image/jpeg' }))
      })
      .catch(() => {
        if (!annule) setFichierJpg(null)
      })
    return () => {
      annule = true
    }
  }, [imageIA, oeuvre?.id])

  if (!oeuvre) return null

  const relancer = () => {
    lanceRef.current = null
    dispatch({ type: 'SELECT', value: oeuvre }) // remet renderAI à idle → l'effet relance
  }

  const drawCard = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#0E0E0E'
    ctx.fillRect(0, 0, W, H)
    const rw = W * 0.5
    const rh = H * 0.6
    const rx = (W - rw) / 2
    const ry = H * 0.09
    drawGradientRect(ctx, oeuvre.gradient, rx, ry, rw, rh)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 10
    ctx.strokeRect(rx, ry, rw, rh)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = "600 46px Georgia, 'Times New Roman', serif"
    ctx.fillText(oeuvre.titre, W / 2, ry + rh + 74)
    ctx.fillStyle = '#C9A96E'
    ctx.font = '500 22px system-ui, sans-serif'
    ctx.fillText(oeuvre.artiste.toUpperCase(), W / 2, ry + rh + 116)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '20px system-ui, sans-serif'
    ctx.fillText(`${oeuvre.medium} · ${oeuvre.dimensions}`, W / 2, ry + rh + 150)
  }

  const composerCarte = (): string | null => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1200
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    drawCard(ctx, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
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
    const nomJpg = `rendu-bartoux-${oeuvre.id}.jpg`
    const nav = navigator as unknown as {
      share?: (data: { files?: File[]; title?: string }) => Promise<void>
      canShare?: (data: { files?: File[] }) => boolean
    }
    const surMobile =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

    // Mobile : partage natif → « Enregistrer l'image » range le JPG dans la
    // pellicule (impossible via un simple téléchargement sur iOS). On n'y va que
    // si le fichier est déjà prêt, pour rester dans le geste utilisateur.
    if (surMobile && fichierJpg && nav.share && nav.canShare?.({ files: [fichierJpg] })) {
      try {
        await nav.share({ files: [fichierJpg], title: oeuvre.titre })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return // partage annulé
        // autre erreur → repli sur le téléchargement fichier ci-dessous
      }
    }

    // Sinon (ordinateur, ou partage indisponible) : téléchargement d'un .jpg.
    let blob: Blob | null = fichierJpg
    if (!blob) {
      let source: string | null = imageIA
      if (!source && hasPhoto && state.photo && rect) {
        try {
          source = await composerScene(state.photo, oeuvre, rect, estPeinture)
        } catch {
          source = null
        }
      }
      source ??= composerCarte()
      if (!source) return
      try {
        blob = await versJpegBlob(source)
      } catch {
        // Ultime repli : la source telle quelle si la conversion JPEG échoue.
        declencherTelechargement(source, `rendu-bartoux-${oeuvre.id}.png`)
        return
      }
    }

    const url = URL.createObjectURL(blob)
    declencherTelechargement(url, nomJpg)
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      <StepEyebrow>{hasPhoto ? 'Rendu chez vous' : 'Votre sélection'}</StepEyebrow>

      {/* Choix de l'œuvre à visualiser parmi la sélection (bande horizontale) */}
      {multi && (
        <div className="mb-4">
          <p className="mb-3 font-serif text-[17px] font-medium leading-snug text-white">
            Quel coup de cœur souhaitez-vous visualiser chez vous&nbsp;?
          </p>
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {state.selection.map((o) => {
              const actif = state.selected?.id === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SELECT', value: o })}
                  aria-pressed={actif}
                  aria-label={`Visualiser ${o.titre}`}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[#0D0D0D] transition-all ${
                    actif
                      ? 'border-or-bartoux'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={o.image} alt={o.titre} className="h-full w-full object-cover" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Visualisation — écran de chargement de marque pendant la génération,
          puis uniquement le rendu final (l'aperçu ne sert que de secours) */}
      <div className="mx-auto w-fit max-w-full">
        <div className="anim-art-reveal relative overflow-hidden rounded-[10px] border border-white/10 bg-[#111]">
          {enCours ? (
            /* En cours : fond blanc + logo Galeries Bartoux + loader */
            <div
              className="flex flex-col items-center justify-center bg-white px-6 text-center"
              style={{ height: 300, width: 320, maxWidth: '100%' }}
            >
              <Logo large className="text-noir-bartoux" />
              <span className="mt-7 h-7 w-7 animate-spin rounded-full border-2 border-noir-bartoux/15 border-t-or-bartoux" />
              <p className="mt-4 font-sans text-[11px] font-light uppercase tracking-[0.16em] text-noir-bartoux/70">
                Intégration de votre œuvre…
              </p>
            </div>
          ) : imageIA ? (
            /* Rendu final IA */
            <img
              src={imageIA}
              alt={`${oeuvre.titre} dans votre espace`}
              className="anim-art-reveal mx-auto block max-h-[300px] w-auto max-w-full align-top"
            />
          ) : hasPhoto ? (
            /* Secours (échec IA) : aperçu à l'échelle calculée */
            <>
              <img
                src={state.photo ?? ''}
                crossOrigin="anonymous"
                alt="Votre espace"
                onError={() => setImgFailed(true)}
                className="mx-auto block max-h-[300px] w-auto max-w-full align-top"
              />
              {rect && (
                <div
                  className="absolute overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.w}%`,
                    height: `${rect.h}%`,
                    border: estPeinture ? '3px solid rgba(255,255,255,0.85)' : 'none'
                  }}
                >
                  {oeuvre.image ? (
                    <img src={oeuvre.image} alt={oeuvre.titre} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" style={{ background: oeuvre.gradient }} />
                  )}
                </div>
              )}
            </>
          ) : (
            /* Sans photo : carte œuvre autonome */
            <>
              <div className="aspect-[3/4] w-[240px] max-w-full" />
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div
                  className="h-[72%] w-[62%] overflow-hidden rounded-md shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
                  style={{ border: '3px solid rgba(255,255,255,0.85)' }}
                >
                  {oeuvre.image ? (
                    <img src={oeuvre.image} alt={oeuvre.titre} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" style={{ background: oeuvre.gradient }} />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Téléchargement — seulement quand un visuel final est disponible */}
          {!enCours && (
            <button
              type="button"
              onClick={() => void telecharger()}
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/60 py-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              <DownloadIcon className="h-4 w-4" />
              Télécharger le rendu
            </button>
          )}
        </div>
      </div>

      {/* Échec du rendu IA : l'aperçu aux proportions calculées reste affiché */}
      {renderAI.status === 'error' && hasPhoto && (
        <p className="mt-2 text-center font-sans text-[11px] font-light text-white/60">
          Rendu affiné indisponible — aperçu à l'échelle affiché.{' '}
          <button
            type="button"
            onClick={relancer}
            className="text-or-bartoux underline underline-offset-2 hover:text-white"
          >
            Réessayer
          </button>
        </p>
      )}

      {/* Légende */}
      <div className="mt-4 rounded-lg bg-[#1A1A1A] p-3">
        <p className="font-serif text-[17px] font-semibold leading-tight text-white">{oeuvre.titre}</p>
        <p className="mt-1 font-sans text-[13px] font-light text-gris-texte">
          {oeuvre.artiste} · {oeuvre.medium} · {oeuvre.dimensions}
        </p>
        {imageIA && (
          <p className="mt-1.5 font-sans text-[10px] font-light italic text-white/40">
            Visualisation générée à l'échelle estimée — non contractuelle.
          </p>
        )}
      </div>

      <div className="mt-auto space-y-3 pt-5">
        <PrimaryButton onClick={() => dispatch({ type: 'GOTO', step: 'lead' })}>
          {multi ? "Ces œuvres m'intéressent — être recontacté" : "Cette œuvre m'intéresse — être recontacté"}
        </PrimaryButton>
        <SecondaryButton onClick={() => dispatch({ type: 'GOTO', step: 'results' })}>
          ← Modifier ma sélection
        </SecondaryButton>
      </div>
    </div>
  )
}
