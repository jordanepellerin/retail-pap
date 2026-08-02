// Banque de questions de qualification — 100 % scriptée, donc gratuite,
// déterministe et fonctionnelle sans clé API.
//
// Le seul « intelligent » du dispositif : une question dont la réponse est DÉJÀ
// dans la demande libre n'est pas posée (cf. `questionsPour`). Quelqu'un qui
// écrit « un costume en lin pour un mariage » ne se voit demander que la
// palette et le budget.

import type { Categorie, Intention } from '../types'

export interface OptionQuestion {
  /** Valeur écrite dans l'intention. Chaîne vide = « peu importe ». */
  value: string
  label: string
}

/** Champs d'intention qu'une question peut renseigner. */
export type ChampQuestion = 'occasions' | 'matieres' | 'couleurs' | 'budgetMax' | 'coupe'

export interface Question {
  id: string
  /** Ne se pose que pour ces familles de produit ; vide = toujours applicable. */
  categories: Categorie[]
  champ: ChampQuestion
  label: string
  hint?: string
  options: OptionQuestion[]
  multi: boolean
}

/** Au-delà, la qualification devient un formulaire — on s'arrête. */
export const QUESTIONS_MAX = 4

const PEU_IMPORTE: OptionQuestion = { value: '', label: 'Peu importe' }

/** Ordre = ordre dans lequel les questions sont posées. */
export const QUESTIONS: Question[] = [
  {
    id: 'occasion',
    categories: [],
    champ: 'occasions',
    label: 'Y a-t-il une occasion particulière ?',
    hint: "C'est ce qui oriente le plus la sélection.",
    multi: false,
    options: [
      { value: 'mariage-invite', label: 'Un mariage — je suis invité' },
      { value: 'mariage-marie', label: 'Mon mariage' },
      { value: 'bureau', label: 'Le bureau, les réunions' },
      { value: 'soiree', label: 'Une soirée, un gala' },
      { value: 'ceremonie', label: 'Une cérémonie' },
      { value: 'quotidien', label: 'Le quotidien' }
    ]
  },
  {
    id: 'matiere-tailleur',
    categories: ['costume', 'veste', 'pantalon'],
    champ: 'matieres',
    label: 'Une matière de prédilection ?',
    hint: 'Le lin respire l’été, la flanelle tient chaud l’hiver.',
    multi: false,
    options: [
      { value: 'laine', label: 'Laine' },
      { value: 'lin', label: 'Lin' },
      { value: 'coton', label: 'Coton' },
      { value: 'flanelle', label: 'Flanelle' },
      { value: 'velours', label: 'Velours' },
      { value: 'tweed', label: 'Tweed' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'matiere-chemise',
    categories: ['chemise'],
    champ: 'matieres',
    label: 'Plutôt quelle matière ?',
    multi: false,
    options: [
      { value: 'popeline', label: 'Popeline — lisse et habillée' },
      { value: 'lin', label: 'Lin — pour l’été' },
      { value: 'coton', label: 'Coton — polyvalent' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'matiere-maille',
    categories: ['maille'],
    champ: 'matieres',
    label: 'Plutôt quelle matière ?',
    multi: false,
    options: [
      { value: 'merinos', label: 'Mérinos — fin et chaud' },
      { value: 'coton', label: 'Coton — toute l’année' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'matiere-chaussures',
    categories: ['chaussures'],
    champ: 'matieres',
    label: 'Cuir ou daim ?',
    multi: false,
    options: [
      { value: 'cuir', label: 'Cuir lisse' },
      { value: 'daim', label: 'Daim' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'couleur',
    categories: [],
    champ: 'couleurs',
    label: 'Vers quelles teintes allez-vous ?',
    hint: 'Plusieurs choix possibles.',
    multi: true,
    options: [
      { value: 'bleu', label: 'Bleus & marine' },
      { value: 'gris', label: 'Gris' },
      { value: 'beige', label: 'Beiges & tons clairs' },
      { value: 'noir', label: 'Noir' },
      { value: 'brun', label: 'Bruns' },
      { value: 'vert', label: 'Verts' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'budget-tailleur',
    categories: ['costume', 'veste', 'chaussures'],
    champ: 'budgetMax',
    label: 'Un budget à ne pas dépasser ?',
    hint: 'Pour la pièce principale.',
    multi: false,
    options: [
      { value: '400', label: 'Jusqu’à 400 €' },
      { value: '700', label: '400 à 700 €' },
      { value: '1000', label: '700 à 1 000 €' },
      { value: '20000', label: 'Au-delà — je regarde tout' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'budget-piece',
    categories: ['pantalon', 'chemise', 'maille', 'accessoire'],
    champ: 'budgetMax',
    label: 'Un budget à ne pas dépasser ?',
    multi: false,
    options: [
      { value: '100', label: 'Jusqu’à 100 €' },
      { value: '180', label: '100 à 180 €' },
      { value: '300', label: '180 à 300 €' },
      { value: '20000', label: 'Au-delà — je regarde tout' },
      PEU_IMPORTE
    ]
  },
  {
    id: 'coupe',
    categories: ['costume', 'veste', 'pantalon'],
    champ: 'coupe',
    label: 'Quelle coupe vous va le mieux ?',
    multi: false,
    options: [
      { value: 'slim', label: 'Ajustée' },
      { value: 'tailored', label: 'Tailored — entre les deux' },
      { value: 'regular', label: 'Droite, confortable' },
      PEU_IMPORTE
    ]
  }
]

/** Le champ d'intention correspondant est-il déjà renseigné ? */
function dejaConnu(intention: Intention, champ: ChampQuestion): boolean {
  if (champ === 'budgetMax') return intention.budgetMax !== null
  if (champ === 'coupe') return intention.coupe !== null
  return intention[champ].length > 0
}

/**
 * Questions à poser pour cette intention : celles qui concernent les familles
 * demandées, dont la réponse n'est pas déjà connue, plafonnées à QUESTIONS_MAX.
 * Une seule question par champ (pas deux fois la matière).
 */
export function questionsPour(intention: Intention): Question[] {
  // Sans catégorie détectée, on part du costume : c'est l'entrée la plus
  // fréquente et ses questions (occasion, matière, palette, budget) couvrent
  // n'importe quelle demande de prêt-à-porter.
  const categories = intention.categories.length > 0 ? intention.categories : ['costume']
  const retenues: Question[] = []
  const champsVus = new Set<ChampQuestion>()
  for (const q of QUESTIONS) {
    if (retenues.length >= QUESTIONS_MAX) break
    if (champsVus.has(q.champ)) continue
    if (q.categories.length > 0 && !q.categories.some((c) => categories.includes(c))) continue
    if (dejaConnu(intention, q.champ)) {
      // Le champ est couvert : on ne le repose pas, ici ni via une variante.
      champsVus.add(q.champ)
      continue
    }
    retenues.push(q)
    champsVus.add(q.champ)
  }
  return retenues
}

/**
 * Applique les réponses par-dessus une intention. Les réponses de
 * l'utilisateur priment : ce sont les seules qu'il a explicitement validées.
 */
export function appliquerReponses(
  intention: Intention,
  reponses: Record<string, string[]>
): Intention {
  const resultat: Intention = {
    ...intention,
    categories: [...intention.categories],
    occasions: [...intention.occasions],
    matieres: [...intention.matieres],
    couleurs: [...intention.couleurs],
    motsCles: [...intention.motsCles]
  }
  for (const question of QUESTIONS) {
    const valeurs = (reponses[question.id] ?? []).filter(Boolean)
    if (valeurs.length === 0) continue
    switch (question.champ) {
      case 'occasions':
        resultat.occasions = valeurs.filter(
          (v): v is Intention['occasions'][number] =>
            question.options.some((o) => o.value === v) && v !== ''
        )
        break
      case 'matieres':
        resultat.matieres = valeurs
        break
      case 'couleurs':
        resultat.couleurs = valeurs
        break
      case 'budgetMax': {
        const n = Number(valeurs[0])
        if (Number.isFinite(n) && n > 0) resultat.budgetMax = n
        break
      }
      case 'coupe': {
        const c = valeurs[0]
        if (c === 'slim' || c === 'tailored' || c === 'regular') resultat.coupe = c
        break
      }
    }
  }
  return resultat
}

/** Question par identifiant (pour ré-afficher le libellé dans le transcript). */
export function questionParId(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id)
}

/** Libellé lisible d'une valeur de réponse, pour le transcript et le brief. */
export function libelleOption(question: Question, value: string): string {
  return question.options.find((o) => o.value === value)?.label ?? value
}
