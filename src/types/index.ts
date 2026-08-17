// Domaine métier — typage strict, aucun `any`.

import type { AnalyseResult, BriefResult, MatchResult } from './ai'

/** Famille de produit du catalogue. */
export type Categorie =
  | 'costume'
  | 'veste'
  | 'pantalon'
  | 'chemise'
  | 'maille'
  | 'chaussures'
  | 'accessoire'

/**
 * Emplacement occupé sur la silhouette. C'est la base des garde-fous de tenue :
 * deux articles qui revendiquent le même emplacement ne peuvent pas être portés
 * ensemble (un costume occupe à lui seul `torse-exterieur` ET `jambes`).
 */
export type Slot =
  | 'torse-exterieur'
  | 'torse-interieur'
  | 'jambes'
  | 'pieds'
  | 'cou'
  | 'taille'
  | 'poche'
  | 'poignet'

/** Contexte d'usage — premier critère de qualification et premier score du matching. */
export type Occasion =
  | 'mariage-invite'
  | 'mariage-marie'
  | 'bureau'
  | 'soiree'
  | 'ceremonie'
  | 'quotidien'

export type Coupe = 'slim' | 'tailored' | 'regular'

/** Nombre maximum de pièces dans une tenue (garde-fou de sécurité). */
export const TENUE_MAX = 8

/** Un article du catalogue André Laurent (données mockées). */
export interface Article {
  id: string
  nom: string
  categorie: Categorie
  /** Emplacements occupés — un costume en occupe DEUX. */
  slots: Slot[]
  /** Matière affichée, ex. « Lin et coton ». */
  matiere: string
  /** Vocabulaire contrôlé pour le matching, ex. ['lin','coton']. */
  matieres: string[]
  /** Couleur affichée, ex. « Beige sable ». */
  couleur: string
  /** Vocabulaire contrôlé pour le matching, ex. ['beige','ecru']. */
  couleurs: string[]
  coupe: Coupe | null
  /** Prix en euros — nombre, pour filtrer sur le budget (affichage : `formatPrix`). */
  prix: number
  tailles: string[]
  /** Visuel servi statiquement (public/produits/…). */
  image: string
  /** Dégradé CSS de secours si le visuel ne charge pas. */
  gradient: string
  occasions: Occasion[]
  motsCles: string[]
  descriptionCourte: string
  /**
   * Formulation injectée telle quelle dans le prompt de rendu — c'est elle qui
   * dit au modèle image ce qu'il doit faire porter à la personne.
   */
  descriptionRendu: string
  /** ids d'articles qui s'accordent — alimente l'étape « complétez la tenue ». */
  accords: string[]
}

/**
 * Besoin normalisé du visiteur. Produit d'abord en pur code
 * (`src/lib/intent.ts`), affiné par l'IA, complété par les réponses aux
 * questions de qualification.
 */
export interface Intention {
  categories: Categorie[]
  occasions: Occasion[]
  matieres: string[]
  couleurs: string[]
  /** Budget maximum en euros pour la pièce principale, null = non exprimé. */
  budgetMax: number | null
  coupe: Coupe | null
  motsCles: string[]
}

/** Intention vide — base de fusion, jamais mutée. */
export const INTENTION_VIDE: Intention = {
  categories: [],
  occasions: [],
  matieres: [],
  couleurs: [],
  budgetMax: null,
  coupe: null,
  motsCles: []
}

/**
 * Machine d'état du flow conversationnel du widget.
 *
 * Le parcours tient en une seule saisie : `request` (demande libre + amorces),
 * `matching` (transitoire), puis les résultats. Ni écran d'accueil, ni
 * questions de qualification, ni écran de reformulation — la reformulation est
 * rendue en tête des résultats, et `selection` ramène à `request` pour relancer.
 */
export type Step =
  | 'request'
  | 'matching'
  | 'selection'
  | 'photo'
  | 'outfit'
  | 'render'
  | 'lead'
  | 'done'

/** Les deux temps de l'étape de sélection. */
export type PhaseSelection = 'demande' | 'complements'

/** Cycle de vie de l'analyse d'intention (skipped = demande déjà claire en code). */
export type AnalyseStatus = 'idle' | 'pending' | 'done' | 'error' | 'skipped'

/** Cycle de vie du rendu IA (la planche « flat lay » reste affichée en secours). */
export interface RenderAIState {
  status: 'idle' | 'pending' | 'done' | 'error'
  /** dataURL de l'essayage généré, si status === 'done'. */
  image: string | null
}

/**
 * Cycle de vie de la reformulation IA (étape `brief`).
 * error/skipped → repli sur la reformulation 100 % code (`src/lib/brief.ts`).
 */
export interface BriefState {
  status: 'idle' | 'pending' | 'done' | 'error' | 'skipped'
  result: BriefResult | null
}

/** Dimensions en pixels de la photo réduite côté client. */
export interface PhotoMeta {
  w: number
  h: number
}

/** État complet de la conversation widget. */
export interface WidgetState {
  step: Step
  /** Demande libre saisie à l'étape `request` — seule entrée du parcours. */
  demande: string
  /** Photo du visiteur (facultative) : dataURL JPEG réduite ≤ 1280 px. */
  photo: string | null
  photoMeta: PhotoMeta | null
  /** Intention affinée par l'IA, null tant que l'appel n'a pas abouti. */
  analyse: AnalyseResult | null
  analyseStatus: AnalyseStatus
  /** Catalogue classé par le scoring code, null tant que le matching n'a pas tourné. */
  matches: MatchResult[] | null
  brief: BriefState
  renderAI: RenderAIState
  /** Temps courant de l'étape de sélection. */
  phase: PhaseSelection
  /** La tenue composée — au plus un article par emplacement. */
  tenue: Article[]
  /** Articles retirés par le dernier ajout (notice de remplacement, transitoire). */
  derniersRetires: Article[]
  email: string
  message: string
}
