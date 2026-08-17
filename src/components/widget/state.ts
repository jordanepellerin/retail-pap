import type { Dispatch } from 'react'
import type { Article, PhaseSelection, PhotoMeta, Step, WidgetState } from '../../types'
import type { AnalyseResult, BriefResult, MatchResult } from '../../types/ai'
import { basculerArticle, retirerArticle } from '../../lib/tenue'

export const initialWidgetState: WidgetState = {
  // Le widget ouvre directement sur la demande : c'est la seule étape de saisie.
  step: 'request',
  demande: '',
  photo: null,
  photoMeta: null,
  analyse: null,
  analyseStatus: 'idle',
  matches: null,
  brief: { status: 'idle', result: null },
  renderAI: { status: 'idle', image: null },
  phase: 'demande',
  tenue: [],
  derniersRetires: [],
  email: '',
  message: ''
}

export type WidgetAction =
  | { type: 'GOTO'; step: Step }
  | { type: 'SET_DEMANDE'; value: string }
  | { type: 'SET_PHOTO'; value: { dataUrl: string; meta: PhotoMeta } | null }
  | { type: 'SKIP_PHOTO' }
  | { type: 'ANALYSE_START' }
  | { type: 'ANALYSE_DONE'; value: AnalyseResult }
  | { type: 'ANALYSE_ERROR' }
  | { type: 'ANALYSE_SKIP' }
  | { type: 'SET_MATCHES'; value: MatchResult[] }
  | { type: 'BRIEF_START' }
  | { type: 'BRIEF_DONE'; value: BriefResult }
  | { type: 'BRIEF_ERROR' }
  | { type: 'SET_PHASE'; value: PhaseSelection }
  | { type: 'TOGGLE_ARTICLE'; value: Article }
  | { type: 'RETIRER_ARTICLE'; id: string }
  | { type: 'EFFACER_NOTICE' }
  | { type: 'RENDER_AI_START' }
  | { type: 'RENDER_AI_RESET' }
  | { type: 'RENDER_AI_DONE'; value: string; cle: string }
  | { type: 'RENDER_AI_ERROR'; cle: string }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_MESSAGE'; value: string }
  | { type: 'RESET' }

export type WidgetDispatch = Dispatch<WidgetAction>

/**
 * Signature de la composition envoyée au rendu. Sert de garde anti-course : une
 * réponse de rendu arrivée après un changement de tenue ou de photo est ignorée.
 */
export function cleRendu(state: WidgetState): string {
  return `${state.photo?.length ?? 0}|${state.tenue.map((a) => a.id).join(',')}`
}

/**
 * Changer la demande invalide tout l'aval : analyse, classement, reformulation.
 * C'est ce qui fait qu'un retour à `request` relance un cycle complet. La tenue
 * est conservée — le visiteur a fait ces choix lui-même, ce n'est pas au widget
 * de les défaire.
 */
const invalidation: Pick<WidgetState, 'analyse' | 'analyseStatus' | 'matches' | 'brief'> = {
  analyse: null,
  analyseStatus: 'idle',
  matches: null,
  brief: { status: 'idle', result: null }
}

/** La photo n'influence que le rendu. */
const invalidationRendu: Pick<WidgetState, 'renderAI'> = {
  renderAI: { status: 'idle', image: null }
}

/**
 * Réducteur de la machine d'état conversationnelle. Aucune saisie ne change
 * d'étape d'elle-même sauf `SKIP_PHOTO` : le visiteur avance toujours par un
 * bouton explicite, y compris pour lancer une génération.
 */
export function widgetReducer(state: WidgetState, action: WidgetAction): WidgetState {
  switch (action.type) {
    case 'GOTO':
      return { ...state, step: action.step }
    case 'SET_DEMANDE':
      return { ...state, demande: action.value, ...invalidation }
    case 'SET_PHOTO':
      return {
        ...state,
        photo: action.value?.dataUrl ?? null,
        photoMeta: action.value?.meta ?? null,
        ...invalidationRendu
      }
    case 'SKIP_PHOTO':
      // Sans photo, l'étape suivante reste la même : le récapitulatif de tenue.
      // Le rendu affichera une planche au lieu d'un essayage.
      return { ...state, photo: null, photoMeta: null, ...invalidationRendu, step: 'outfit' }
    case 'ANALYSE_START':
      return { ...state, analyse: null, analyseStatus: 'pending' }
    case 'ANALYSE_DONE':
      return { ...state, analyse: action.value, analyseStatus: 'done' }
    case 'ANALYSE_ERROR':
      return { ...state, analyse: null, analyseStatus: 'error' }
    case 'ANALYSE_SKIP':
      // Demande déjà entièrement lue en code : aucun appel réseau nécessaire.
      return { ...state, analyse: null, analyseStatus: 'skipped' }
    case 'SET_MATCHES':
      return { ...state, matches: action.value }
    case 'BRIEF_START':
      return { ...state, brief: { status: 'pending', result: null } }
    case 'BRIEF_DONE':
      return { ...state, brief: { status: 'done', result: action.value } }
    case 'BRIEF_ERROR':
      return { ...state, brief: { status: 'error', result: null } }
    case 'SET_PHASE':
      return { ...state, phase: action.value }
    case 'TOGGLE_ARTICLE': {
      const { tenue, retires } = basculerArticle(state.tenue, action.value)
      if (tenue === state.tenue) return state // plafond atteint
      return { ...state, tenue, derniersRetires: retires, ...invalidationRendu }
    }
    case 'RETIRER_ARTICLE':
      return {
        ...state,
        tenue: retirerArticle(state.tenue, action.id),
        derniersRetires: [],
        ...invalidationRendu
      }
    case 'EFFACER_NOTICE':
      return { ...state, derniersRetires: [] }
    case 'RENDER_AI_START':
      return { ...state, renderAI: { status: 'pending', image: null } }
    case 'RENDER_AI_RESET':
      // « Réessayer » après un échec : repasser à idle relance l'effet de rendu.
      return { ...state, ...invalidationRendu }
    case 'RENDER_AI_DONE':
      // Réponse tardive (tenue ou photo changée entre-temps) : ignorée.
      if (state.renderAI.status !== 'pending' || cleRendu(state) !== action.cle) return state
      return { ...state, renderAI: { status: 'done', image: action.value } }
    case 'RENDER_AI_ERROR':
      if (state.renderAI.status !== 'pending' || cleRendu(state) !== action.cle) return state
      return { ...state, renderAI: { status: 'error', image: null } }
    case 'SET_EMAIL':
      return { ...state, email: action.value }
    case 'SET_MESSAGE':
      return { ...state, message: action.value }
    case 'RESET':
      return initialWidgetState
    default:
      return state
  }
}

export interface StepProps {
  state: WidgetState
  dispatch: WidgetDispatch
}

/**
 * Étape précédente pour le bouton « Retour ». `selection → request` saute
 * volontairement `matching` (transitoire, auto-animé) : y revenir relancerait le
 * pipeline en boucle. Pas de retour depuis `request` (c'est le début), ni depuis
 * `matching` ni `done`.
 */
export const previousStep: Partial<Record<Step, Step>> = {
  selection: 'request',
  photo: 'selection',
  outfit: 'photo',
  render: 'outfit',
  lead: 'render'
}
