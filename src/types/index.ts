// Domaine métier — typage strict, aucun `any`.

import type { AnalyseResult, JustifyResult, MatchResult } from './ai'

/** Catégorie d'œuvre proposée dans le widget. Une seule sélection possible. */
export type Tag = 'sculpture' | 'peinture'

/** Nombre maximum d'œuvres que le visiteur peut retenir dans sa sélection. */
export const SELECTION_MAX = 5

/** Dimensions réelles en centimètres (null = inconnue sur cet axe). */
export interface OeuvreDims {
  h: number | null
  l: number | null
  p: number | null
}

export type Orientation = 'portrait' | 'paysage' | 'carre' | 'volume'

/** Une œuvre du catalogue Bartoux (données mockées). */
export interface Oeuvre {
  id: string
  artiste: string
  titre: string
  medium: string
  dimensions: string
  prix: string
  tag: Tag
  /** Dégradé CSS de secours (canvas de téléchargement si la photo ne charge pas). */
  gradient: string
  /** Photo de l'œuvre servie statiquement (public/artistes/…). */
  image: string
  /** Dimensions machine (cm), saisies à la main depuis `dimensions`. */
  dims: OeuvreDims
  orientation: Orientation
  /** Vocabulaire contrôlé pour le matching (thèmes, sujets, matières). */
  motsCles: string[]
  /** Couleurs dominantes de l'œuvre, pour l'accord avec l'intérieur. */
  couleurs: string[]
  /** Une phrase descriptive, utilisée par le scoring et les prompts. */
  descriptionCourte: string
}

/** Machine d'état du flow conversationnel du widget. */
export type Step =
  | 'welcome'
  | 'type'
  | 'photo'
  | 'matching'
  | 'presentation'
  | 'results'
  | 'render'
  | 'lead'
  | 'done'

/** Cycle de vie de l'appel d'analyse (skipped = pas nécessaire : artiste nommé sans photo). */
export type AnalyseStatus = 'idle' | 'pending' | 'done' | 'error' | 'skipped'

/** Cycle de vie du rendu IA (l'overlay code reste affiché en attendant / en secours). */
export interface RenderAIState {
  status: 'idle' | 'pending' | 'done' | 'error'
  /** dataURL du rendu harmonisé par le modèle image, si status === 'done'. */
  image: string | null
}

/**
 * Cycle de vie de la justification IA (étape « présentation des artistes »).
 * skipped = aucun artiste à justifier ; error/skipped → repli sur les
 * justifications 100 % code.
 */
export interface JustifyState {
  status: 'idle' | 'pending' | 'done' | 'error' | 'skipped'
  result: JustifyResult | null
}

/** Dimensions en pixels de la photo réduite côté client (sert au calcul d'échelle). */
export interface PhotoMeta {
  w: number
  h: number
}

/** État complet de la conversation widget. */
export interface WidgetState {
  step: Step
  type: Tag | null
  /** Précision libre de la recherche (ex. nom d'artiste), saisie à l'étape type (facultatif). */
  recherche: string
  /** Photo de l'espace (facultative) : dataURL JPEG réduite ≤ 1280 px. */
  photo: string | null
  /** Dimensions pixel de `photo` (null si pas de photo). */
  photoMeta: PhotoMeta | null
  /** Description libre de l'espace / repère de dimension (facultatif). */
  description: string
  /** Résultat de l'analyse IA (photo + intention), null tant que non lancée. */
  analyse: AnalyseResult | null
  analyseStatus: AnalyseStatus
  /** Catalogue classé par le scoring code, null tant que le matching n'a pas tourné. */
  matches: MatchResult[] | null
  /** Reformulation + justifications IA des artistes retenus (repli code si absent). */
  justify: JustifyState
  renderAI: RenderAIState
  /** Sélection multiple du visiteur (ses coups de cœur), plafonnée à SELECTION_MAX. */
  selection: Oeuvre[]
  /** Œuvre actuellement visualisée en rendu — toujours un membre de `selection`. */
  selected: Oeuvre | null
  email: string
  /** Message libre joint à la demande de contact (facultatif). */
  message: string
}
