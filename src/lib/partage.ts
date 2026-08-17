// Récupération du visuel final par le visiteur — partagé par l'essayage du
// widget (StepRender) et par celui de la fiche produit (ModaleEssayage).
//
// Sur mobile, un simple téléchargement ne range rien dans la pellicule (iOS) :
// seul le partage natif le fait. Or `navigator.share` exige d'être appelé dans
// le geste utilisateur — un `await` avant lui fait perdre ce geste et iOS refuse.
// D'où deux fonctions distinctes : on PRÉPARE le fichier dès que le visuel
// existe, et on PARTAGE au clic, sans rien attendre entre-temps.

import { surMobile } from './appareil'
import { versJpegBlob } from './image'

/** Encode le visuel en fichier JPG, prêt pour un partage natif instantané. */
export async function preparerFichierJpg(visuel: string, nom: string): Promise<File> {
  const blob = await versJpegBlob(visuel)
  return new File([blob], nom, { type: 'image/jpeg' })
}

function declencherTelechargement(url: string, nom: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Partage natif sur mobile, téléchargement fichier partout ailleurs.
 * `fichierJpg` est celui préparé par `preparerFichierJpg` ; s'il n'est pas
 * encore prêt, on retombe sur un encodage à la volée puis sur le visuel brut.
 */
export async function partagerOuTelecharger(
  visuel: string,
  fichierJpg: File | null,
  { nom, titre }: { nom: string; titre: string }
): Promise<void> {
  const nav = navigator as unknown as {
    share?: (data: { files?: File[]; title?: string }) => Promise<void>
    canShare?: (data: { files?: File[] }) => boolean
  }
  if (surMobile() && fichierJpg && nav.share && nav.canShare?.({ files: [fichierJpg] })) {
    try {
      await nav.share({ files: [fichierJpg], title: titre })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // partage annulé
      // autre erreur → repli sur le téléchargement fichier ci-dessous
    }
  }

  let blob: Blob | null = fichierJpg
  if (!blob) {
    try {
      blob = await versJpegBlob(visuel)
    } catch {
      // Encodage impossible : le visuel brut (dataURL PNG) fait l'affaire.
      declencherTelechargement(visuel, nom.replace(/\.jpe?g$/i, '.png'))
      return
    }
  }
  const url = URL.createObjectURL(blob)
  declencherTelechargement(url, nom)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
