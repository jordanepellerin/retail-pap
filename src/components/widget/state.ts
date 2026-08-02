import type { Dispatch } from 'react'
import type { WidgetState, Step, Tag, Oeuvre, PhotoMeta } from '../../types'
import { SELECTION_MAX } from '../../types'
import type { AnalyseResult, JustifyResult, MatchResult } from '../../types/ai'

export const initialWidgetState: WidgetState = {
  step: 'welcome',
  type: 'sculpture', // pré-sélection par défaut à l'étape « type d'œuvre »
  recherche: '',
  photo: null,
  photoMeta: null,
  description: '',
  analyse: null,
  analyseStatus: 'idle',
  matches: null,
  justify: { status: 'idle', result: null },
  renderAI: { status: 'idle', image: null },
  selection: [],
  selected: null,
  email: '',
  message: ''
}

export type WidgetAction =
  | { type: 'GOTO'; step: Step }
  | { type: 'SET_TYPE'; value: Tag }
  | { type: 'SET_RECHERCHE'; value: string }
  | { type: 'SET_PHOTO'; value: { dataUrl: string; meta: PhotoMeta } | null }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SKIP_PHOTO' }
  | { type: 'ANALYSE_START' }
  | { type: 'ANALYSE_DONE'; value: AnalyseResult }
  | { type: 'ANALYSE_ERROR' }
  | { type: 'ANALYSE_SKIP' }
  | { type: 'SET_MATCHES'; value: MatchResult[] }
  | { type: 'JUSTIFY_START' }
  | { type: 'JUSTIFY_DONE'; value: JustifyResult }
  | { type: 'JUSTIFY_ERROR' }
  | { type: 'JUSTIFY_SKIP' }
  | { type: 'RENDER_AI_START' }
  | { type: 'RENDER_AI_DONE'; value: string; oeuvreId: string }
  | { type: 'RENDER_AI_ERROR'; oeuvreId: string }
  | { type: 'TOGGLE_SELECT'; value: Oeuvre }
  | { type: 'SELECT'; value: Oeuvre }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_MESSAGE'; value: string }
  | { type: 'RESET' }

export type WidgetDispatch = Dispatch<WidgetAction>

/** Changer le type ou la recherche invalide l'analyse, le matching, la justification et le rendu. */
const invalidation: Pick<
  WidgetState,
  'analyse' | 'analyseStatus' | 'matches' | 'justify' | 'renderAI'
> = {
  analyse: null,
  analyseStatus: 'idle',
  matches: null,
  justify: { status: 'idle', result: null },
  renderAI: { status: 'idle', image: null }
}

/**
 * La photo et la description arrivent APRÈS le matching (nouvel ordre) : elles
 * n'invalident que le rendu, l'analyse photo qui l'alimente et la justification
 * (qui reprend la description) — jamais la sélection déjà établie (matches conservés).
 */
const invalidationRendu: Pick<
  WidgetState,
  'analyse' | 'analyseStatus' | 'justify' | 'renderAI'
> = {
  analyse: null,
  analyseStatus: 'idle',
  justify: { status: 'idle', result: null },
  renderAI: { status: 'idle', image: null }
}

/**
 * Réducteur de la machine d'état conversationnelle.
 * Certaines saisies avancent d'elles-mêmes (choisir un type mène à la photo) ;
 * la photo et la sélection d'œuvre ne changent pas d'étape (l'utilisateur
 * confirme via un bouton « Continuer »).
 */
export function widgetReducer(state: WidgetState, action: WidgetAction): WidgetState {
  switch (action.type) {
    case 'GOTO':
      return { ...state, step: action.step }
    case 'SET_TYPE':
      // Sélectionne le type sans avancer : l'utilisateur confirme via « Continuer ».
      return { ...state, type: action.value, ...invalidation }
    case 'SET_RECHERCHE':
      return { ...state, recherche: action.value, ...invalidation }
    case 'SET_PHOTO':
      return {
        ...state,
        photo: action.value?.dataUrl ?? null,
        photoMeta: action.value?.meta ?? null,
        ...invalidationRendu
      }
    case 'SET_DESCRIPTION':
      return { ...state, description: action.value, ...invalidationRendu }
    case 'SKIP_PHOTO':
      // Ignorer la photo : on va directement au rendu (carte œuvre sans photo).
      return { ...state, photo: null, photoMeta: null, ...invalidationRendu, step: 'render' }
    case 'ANALYSE_START':
      return { ...state, analyse: null, analyseStatus: 'pending' }
    case 'ANALYSE_DONE':
      return { ...state, analyse: action.value, analyseStatus: 'done' }
    case 'ANALYSE_ERROR':
      return { ...state, analyse: null, analyseStatus: 'error' }
    case 'ANALYSE_SKIP':
      // Pas d'appel IA nécessaire (artiste nommé sans photo, ou aucune entrée libre).
      return { ...state, analyse: null, analyseStatus: 'skipped' }
    case 'SET_MATCHES':
      return { ...state, matches: action.value }
    case 'JUSTIFY_START':
      return { ...state, justify: { status: 'pending', result: null } }
    case 'JUSTIFY_DONE':
      return { ...state, justify: { status: 'done', result: action.value } }
    case 'JUSTIFY_ERROR':
      return { ...state, justify: { status: 'error', result: null } }
    case 'JUSTIFY_SKIP':
      return { ...state, justify: { status: 'skipped', result: null } }
    case 'RENDER_AI_START':
      return { ...state, renderAI: { status: 'pending', image: null } }
    case 'RENDER_AI_DONE':
      // Réponse tardive (œuvre changée ou entrées invalidées entre-temps) : ignorée.
      if (state.renderAI.status !== 'pending' || state.selected?.id !== action.oeuvreId) return state
      return { ...state, renderAI: { status: 'done', image: action.value } }
    case 'RENDER_AI_ERROR':
      if (state.renderAI.status !== 'pending' || state.selected?.id !== action.oeuvreId) return state
      return { ...state, renderAI: { status: 'error', image: null } }
    case 'TOGGLE_SELECT': {
      const deja = state.selection.some((o) => o.id === action.value.id)
      if (deja) {
        const selection = state.selection.filter((o) => o.id !== action.value.id)
        // Si on retire l'œuvre en cours de visualisation, on bascule sur une
        // autre de la liste (ou aucune) et on remet le rendu à zéro.
        if (state.selected?.id === action.value.id) {
          return {
            ...state,
            selection,
            selected: selection[0] ?? null,
            renderAI: { status: 'idle', image: null }
          }
        }
        return { ...state, selection }
      }
      // Plafond atteint : on ignore l'ajout (l'UI le signale déjà).
      if (state.selection.length >= SELECTION_MAX) return state
      return { ...state, selection: [...state.selection, action.value] }
    }
    case 'SELECT':
      // Changer d'œuvre visualisée invalide le rendu IA de la précédente.
      return { ...state, selected: action.value, renderAI: { status: 'idle', image: null } }
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
 * Étape précédente pour le bouton « Retour » (ordre : type → matching →
 * presentation → results → photo → render → lead). `presentation → type` saute
 * volontairement `matching` (transitoire, auto-animé) ; `presentation` et
 * `results` se redérivent tous deux de `state.matches` (conservés). Pas de
 * retour depuis `welcome`, `matching` ni `done`.
 */
export const previousStep: Partial<Record<Step, Step>> = {
  type: 'welcome',
  presentation: 'type',
  results: 'presentation',
  photo: 'results',
  render: 'photo',
  lead: 'render'
}
