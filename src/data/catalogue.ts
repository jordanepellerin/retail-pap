// Catalogue André Laurent — données mockées, enrichies pour le matching
// (vocabulaire contrôlé de matières/couleurs, occasions) et pour le rendu IA
// (`descriptionRendu` : la phrase exacte lue par le modèle image).
//
// Les visuels sont des SVG stylisés générés par `scripts/generer-visuels.mjs`.
// Pour passer aux vraies photos produit : déposer `<slug>.jpg` dans
// public/produits/ et remplacer l'extension ci-dessous (cf. public/produits/README.md).

import type { Article, Categorie, Occasion, Slot } from '../types'

/** Prix formaté à la française, ex. « 1 090 € ». */
export function formatPrix(euros: number): string {
  return `${euros.toLocaleString('fr-FR')} €`
}

/**
 * Visuel d'un article : la photo si elle a été générée, le SVG sinon.
 *
 * Le catalogue ne référence qu'un chemin (`image`, en `.svg`). Tant que
 * `npm run photos` n'a pas tourné, `<slug>.jpg` n'existe pas et l'interface
 * retombe sur le SVG via `onError`. Le jour où les photos sont déposées, le
 * site bascule dessus sans une ligne de code à changer.
 */
export function visuelArticle(article: Article): { src: string; secours: string } {
  return { src: article.image.replace(/\.svg$/, '.jpg'), secours: article.image }
}

/** Bascule une balise `<img>` sur le visuel de secours, une seule fois. */
export function surErreurVisuel(
  e: { currentTarget: HTMLImageElement },
  secours: string
): void {
  const img = e.currentTarget
  if (img.dataset.secoursApplique === '1') return
  img.dataset.secoursApplique = '1'
  img.src = secours
}

export const LIBELLES_COUPE: Record<NonNullable<Article['coupe']>, string> = {
  slim: 'Slim Fit',
  tailored: 'Tailored Fit',
  regular: 'Regular Fit'
}

/** Ligne « matière + coupe » affichée sous le nom, ex. « Lin Slim Fit ». */
export function sousTitreArticle(article: Article): string {
  const coupe = article.coupe ? LIBELLES_COUPE[article.coupe] : null
  return [article.matiere, coupe].filter(Boolean).join(' ')
}

/**
 * Déclinaisons de couleur d'un article : les autres articles portant le même
 * nom. Alimente le nuancier des cartes produit, sans inventer de coloris.
 */
export function declinaisons(article: Article): Article[] {
  return CATALOGUE.filter((a) => a.nom === article.nom)
}

/** Couleur dominante d'un article, extraite de son dégradé (pour le nuancier). */
export function pastilleCouleur(article: Article): string {
  return /#[0-9A-Fa-f]{6}/.exec(article.gradient)?.[0] ?? '#8A8A8A'
}

/** Emplacements occupés par défaut selon la famille de produit. */
export const SLOTS_PAR_CATEGORIE: Record<Categorie, Slot[]> = {
  // Un costume habille le torse ET les jambes : c'est ce qui interdit d'y
  // ajouter une veste ou un pantalon séparés.
  costume: ['torse-exterieur', 'jambes'],
  veste: ['torse-exterieur'],
  pantalon: ['jambes'],
  chemise: ['torse-interieur'],
  maille: ['torse-interieur'],
  chaussures: ['pieds'],
  // Les accessoires précisent leur emplacement article par article.
  accessoire: []
}

/**
 * `avecArticle` sert aux phrases rédigées (« Vous cherchez un costume… ») :
 * sans lui, la reformulation enchaîne des noms nus et sonne comme un filtre.
 */
export const LIBELLES_CATEGORIE: Record<
  Categorie,
  { singulier: string; pluriel: string; avecArticle: string }
> = {
  costume: { singulier: 'Costume', pluriel: 'Costumes', avecArticle: 'un costume' },
  veste: { singulier: 'Veste', pluriel: 'Vestes & blazers', avecArticle: 'une veste' },
  pantalon: { singulier: 'Pantalon', pluriel: 'Pantalons', avecArticle: 'un pantalon' },
  chemise: { singulier: 'Chemise', pluriel: 'Chemises', avecArticle: 'une chemise' },
  maille: { singulier: 'Maille', pluriel: 'Mailles', avecArticle: 'une pièce en maille' },
  chaussures: { singulier: 'Chaussures', pluriel: 'Chaussures', avecArticle: 'des chaussures' },
  accessoire: { singulier: 'Accessoire', pluriel: 'Accessoires', avecArticle: 'un accessoire' }
}

export const LIBELLES_OCCASION: Record<Occasion, string> = {
  'mariage-invite': 'un mariage (invité)',
  'mariage-marie': 'votre mariage',
  bureau: 'le bureau',
  soiree: 'une soirée habillée',
  ceremonie: 'une cérémonie',
  quotidien: 'le quotidien'
}

export const LIBELLES_SLOT: Record<Slot, string> = {
  'torse-exterieur': 'pièce extérieure',
  'torse-interieur': 'haut',
  jambes: 'bas',
  pieds: 'chaussures',
  cou: 'cravate',
  taille: 'ceinture',
  poche: 'pochette',
  poignet: 'poignet'
}

const TAILLES_COSTUME = ['46', '48', '50', '52', '54', '56']
const TAILLES_PANTALON = ['42', '44', '46', '48', '50', '52']
const TAILLES_CHEMISE = ['37', '38', '39', '40', '41', '42', '43']
const TAILLES_CHAUSSURE = ['39', '40', '41', '42', '43', '44', '45', '46']
const TAILLE_UNIQUE = ['Taille unique']

export const CATALOGUE: Article[] = [
  // ─────────────────────────────── Costumes
  {
    id: 'c1',
    nom: 'Costume deux-pièces en laine',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Laine Super 110s',
    matieres: ['laine'],
    couleur: 'Bleu marine',
    couleurs: ['bleu', 'marine'],
    coupe: 'tailored',
    prix: 749,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-laine-marine.svg',
    gradient: 'linear-gradient(145deg, #2C3A55, #161E2E)',
    occasions: ['bureau', 'mariage-invite', 'ceremonie', 'soiree'],
    motsCles: ['classique', 'intemporel', 'bureau', 'mariage', 'quatre saisons'],
    descriptionCourte:
      'Le costume de référence : laine peignée bleu marine, veste deux boutons, tombé net en toutes saisons.',
    descriptionRendu:
      'un costume deux-pièces en laine bleu marine, veste à deux boutons et revers crantés, pantalon assorti sans revers',
    accords: ['h1', 'h2', 'a1', 's2', 'a5', 'a4']
  },
  {
    id: 'c2',
    nom: 'Costume deux-pièces en laine froide',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Laine froide',
    matieres: ['laine'],
    couleur: 'Gris clair',
    couleurs: ['gris'],
    coupe: 'slim',
    prix: 749,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-laine-gris.svg',
    gradient: 'linear-gradient(145deg, #A8A9AD, #6E7075)',
    occasions: ['bureau', 'mariage-invite', 'ceremonie'],
    motsCles: ['léger', 'été', 'clair', 'mariage', 'bureau'],
    descriptionCourte:
      "Laine froide gris clair, respirante : la coupe slim d'un costume de ville, la légèreté d'un costume d'été.",
    descriptionRendu:
      'un costume deux-pièces en laine froide gris clair, veste cintrée à deux boutons, pantalon droit assorti',
    accords: ['h1', 'h2', 'a1', 's1', 'a4']
  },
  {
    id: 'c3',
    nom: 'Costume deux-pièces en lin',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Lin et coton',
    matieres: ['lin', 'coton'],
    couleur: 'Beige sable',
    couleurs: ['beige', 'ecru'],
    coupe: 'tailored',
    prix: 649,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-lin-beige.svg',
    gradient: 'linear-gradient(145deg, #D8C7A6, #A08F70)',
    occasions: ['mariage-invite', 'mariage-marie', 'ceremonie', 'quotidien'],
    motsCles: ['été', 'extérieur', 'mariage', 'chaleur', 'clair', 'méditerranéen'],
    descriptionCourte:
      'Mélange lin-coton beige sable, structure souple et froissé noble : le costume des mariages en extérieur.',
    descriptionRendu:
      'un costume deux-pièces en lin beige sable, veste déstructurée à deux boutons au froissé naturel, pantalon assorti',
    accords: ['h4', 'h1', 'a4', 's3', 'a5']
  },
  {
    id: 'c4',
    nom: 'Costume deux-pièces en lin',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Lin et coton',
    matieres: ['lin', 'coton'],
    couleur: 'Vert olive',
    couleurs: ['vert', 'olive'],
    coupe: 'tailored',
    prix: 649,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-lin-vert.svg',
    gradient: 'linear-gradient(145deg, #8B8B5E, #575A38)',
    occasions: ['mariage-invite', 'quotidien', 'ceremonie'],
    motsCles: ['été', 'extérieur', 'original', 'nature', 'mariage'],
    descriptionCourte:
      "Le lin dans un vert olive discret : un costume d'été qui sort du bleu sans jamais crier.",
    descriptionRendu:
      'un costume deux-pièces en lin vert olive, veste souple à deux boutons, pantalon assorti à la coupe droite',
    accords: ['h4', 'h1', 's3', 'a4']
  },
  {
    id: 'c5',
    nom: 'Costume deux-pièces en flanelle',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Flanelle de laine',
    matieres: ['flanelle', 'laine'],
    couleur: 'Gris anthracite',
    couleurs: ['gris', 'anthracite'],
    coupe: 'tailored',
    prix: 829,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-flanelle-anthracite.svg',
    gradient: 'linear-gradient(145deg, #55575C, #2E3034)',
    occasions: ['bureau', 'ceremonie', 'soiree'],
    motsCles: ['hiver', 'chaud', 'sombre', 'bureau', 'matière'],
    descriptionCourte:
      "Flanelle anthracite au toucher duveteux : la chaleur et la profondeur de matière d'un costume d'hiver.",
    descriptionRendu:
      'un costume deux-pièces en flanelle de laine gris anthracite, veste à deux boutons au drapé épais, pantalon assorti',
    accords: ['h1', 'h2', 'a2', 's1', 'm1']
  },
  {
    id: 'c6',
    nom: 'Costume Prince-de-Galles',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Laine à carreaux',
    matieres: ['laine'],
    couleur: 'Gris et brun',
    couleurs: ['gris', 'brun'],
    coupe: 'tailored',
    prix: 899,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-carreaux-prince-de-galles.svg',
    gradient: 'linear-gradient(145deg, #9A9186, #5E574D)',
    occasions: ['bureau', 'mariage-invite', 'ceremonie'],
    motsCles: ['carreaux', 'motif', 'anglais', 'caractère', 'bureau'],
    descriptionCourte:
      'Le Prince-de-Galles, motif anglais par excellence : un costume qui a du caractère sans quitter le registre sobre.',
    descriptionRendu:
      'un costume deux-pièces en laine à motif Prince-de-Galles gris et brun, veste à deux boutons, pantalon assorti au même motif',
    accords: ['h1', 'a2', 's2', 'a5']
  },
  {
    id: 'c7',
    nom: 'Smoking à revers satin',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Laine et soie',
    matieres: ['laine', 'soie'],
    couleur: 'Noir',
    couleurs: ['noir'],
    coupe: 'slim',
    prix: 1090,
    tailles: TAILLES_COSTUME,
    image: '/produits/smoking-noir.svg',
    gradient: 'linear-gradient(145deg, #23242A, #0C0D10)',
    occasions: ['soiree', 'mariage-marie', 'ceremonie'],
    motsCles: ['smoking', 'gala', 'soirée', 'black tie', 'cérémonie', 'noir'],
    descriptionCourte:
      'Revers châle en satin de soie et galon au pantalon : la tenue de soirée, dans les règles.',
    descriptionRendu:
      'un smoking noir, veste à un bouton et revers châle en satin de soie brillant, pantalon assorti avec galon de satin sur la couture latérale',
    accords: ['h6', 'a3', 's1', 'a4']
  },
  {
    id: 'c8',
    nom: 'Costume en velours',
    categorie: 'costume',
    slots: SLOTS_PAR_CATEGORIE.costume,
    matiere: 'Velours de coton',
    matieres: ['velours', 'coton'],
    couleur: 'Bleu nuit',
    couleurs: ['bleu', 'nuit'],
    coupe: 'slim',
    prix: 949,
    tailles: TAILLES_COSTUME,
    image: '/produits/costume-velours-bleu-nuit.svg',
    gradient: 'linear-gradient(145deg, #2A2F4A, #12142A)',
    occasions: ['soiree', 'ceremonie', 'mariage-marie'],
    motsCles: ['velours', 'soirée', 'fête', 'matière', 'profond'],
    descriptionCourte:
      "Velours bleu nuit qui capte la lumière : l'alternative au smoking pour les soirées où l'on veut être remarqué.",
    descriptionRendu:
      'un costume deux-pièces en velours bleu nuit à la surface veloutée qui capte la lumière, veste à un bouton, pantalon assorti',
    accords: ['h1', 'a3', 's1', 'a4']
  },

  // ─────────────────────────────── Vestes & blazers
  {
    id: 'v1',
    nom: 'Veste en lin',
    categorie: 'veste',
    slots: SLOTS_PAR_CATEGORIE.veste,
    matiere: 'Lin',
    matieres: ['lin'],
    couleur: 'Bleu ciel',
    couleurs: ['bleu', 'ciel'],
    coupe: 'tailored',
    prix: 379,
    tailles: TAILLES_COSTUME,
    image: '/produits/veste-lin-bleu.svg',
    gradient: 'linear-gradient(145deg, #9EB6CC, #62809A)',
    occasions: ['quotidien', 'mariage-invite', 'bureau'],
    motsCles: ['été', 'léger', 'clair', 'décontracté', 'extérieur'],
    descriptionCourte:
      'Veste en lin bleu ciel, non doublée : elle se porte aussi bien sur un chino que sur un pantalon habillé.',
    descriptionRendu:
      'une veste de costume en lin bleu ciel, déstructurée et non doublée, deux boutons, au froissé naturel du lin',
    accords: ['h1', 'p2', 'p3', 's3', 'a4']
  },
  {
    id: 'v2',
    nom: 'Blazer en laine',
    categorie: 'veste',
    slots: SLOTS_PAR_CATEGORIE.veste,
    matiere: 'Laine',
    matieres: ['laine'],
    couleur: 'Bleu marine',
    couleurs: ['bleu', 'marine'],
    coupe: 'tailored',
    prix: 449,
    tailles: TAILLES_COSTUME,
    image: '/produits/blazer-laine-marine.svg',
    gradient: 'linear-gradient(145deg, #2E3C58, #171F31)',
    occasions: ['bureau', 'quotidien', 'ceremonie', 'mariage-invite'],
    motsCles: ['blazer', 'polyvalent', 'classique', 'boutons dorés', 'bureau'],
    descriptionCourte:
      "Le blazer marine à boutons métal : la pièce qui rattrape n'importe quel pantalon et n'importe quelle journée.",
    descriptionRendu:
      'un blazer en laine bleu marine à deux boutons métal dorés, revers crantés, coupe ajustée',
    accords: ['h2', 'p1', 'p2', 's2', 'a1']
  },
  {
    id: 'v3',
    nom: 'Veste en lin',
    categorie: 'veste',
    slots: SLOTS_PAR_CATEGORIE.veste,
    matiere: 'Lin',
    matieres: ['lin'],
    couleur: 'Rose poudré',
    couleurs: ['rose'],
    coupe: 'slim',
    prix: 379,
    tailles: TAILLES_COSTUME,
    image: '/produits/veste-lin-rose.svg',
    gradient: 'linear-gradient(145deg, #E4C2BC, #B78D87)',
    occasions: ['mariage-invite', 'quotidien'],
    motsCles: ['été', 'clair', 'original', 'mariage', 'méditerranéen'],
    descriptionCourte:
      'Un rose poudré assumé mais doux, en lin non doublé : la veste des mariages en plein soleil.',
    descriptionRendu:
      'une veste de costume en lin rose poudré, déstructurée et non doublée, deux boutons',
    accords: ['h4', 'p3', 's3', 'a4']
  },
  {
    id: 'v4',
    nom: 'Veste en tweed',
    categorie: 'veste',
    slots: SLOTS_PAR_CATEGORIE.veste,
    matiere: 'Tweed de laine',
    matieres: ['tweed', 'laine'],
    couleur: 'Brun chiné',
    couleurs: ['brun'],
    coupe: 'regular',
    prix: 489,
    tailles: TAILLES_COSTUME,
    image: '/produits/veste-tweed-brun.svg',
    gradient: 'linear-gradient(145deg, #8A7458, #4E4132)',
    occasions: ['quotidien', 'bureau'],
    motsCles: ['hiver', 'tweed', 'chaud', 'campagne', 'matière'],
    descriptionCourte:
      "Tweed brun chiné aux coudières : la veste d'hiver qui vieillit mieux que vous.",
    descriptionRendu:
      'une veste en tweed de laine brun chiné à la texture marquée, trois boutons, coudières en cuir',
    accords: ['m1', 'p5', 'p1', 's2']
  },
  {
    id: 'v5',
    nom: 'Veste en velours',
    categorie: 'veste',
    slots: SLOTS_PAR_CATEGORIE.veste,
    matiere: 'Velours de coton',
    matieres: ['velours', 'coton'],
    couleur: 'Vert forêt',
    couleurs: ['vert'],
    coupe: 'slim',
    prix: 529,
    tailles: TAILLES_COSTUME,
    image: '/produits/veste-velours-vert.svg',
    gradient: 'linear-gradient(145deg, #2F4A3A, #16281D)',
    occasions: ['soiree', 'ceremonie', 'quotidien'],
    motsCles: ['velours', 'soirée', 'fête', 'profond', 'original'],
    descriptionCourte:
      'Velours vert forêt à revers châle : la veste de dîner qui remplace le smoking sans le trahir.',
    descriptionRendu:
      'une veste de smoking en velours vert forêt à revers châle, un bouton, surface veloutée profonde',
    accords: ['h1', 'p1', 'a3', 's1']
  },

  // ─────────────────────────────── Pantalons
  {
    id: 'p1',
    nom: 'Pantalon en flanelle',
    categorie: 'pantalon',
    slots: SLOTS_PAR_CATEGORIE.pantalon,
    matiere: 'Flanelle de laine',
    matieres: ['flanelle', 'laine'],
    couleur: 'Gris anthracite',
    couleurs: ['gris', 'anthracite'],
    coupe: 'tailored',
    prix: 189,
    tailles: TAILLES_PANTALON,
    image: '/produits/pantalon-flanelle-gris.svg',
    gradient: 'linear-gradient(145deg, #56585D, #2F3135)',
    occasions: ['bureau', 'ceremonie', 'quotidien'],
    motsCles: ['hiver', 'chaud', 'habillé', 'sombre'],
    descriptionCourte:
      'Flanelle grise, tombé impeccable : le pantalon qui va avec tout ce qui est bleu ou brun.',
    descriptionRendu:
      'un pantalon de costume en flanelle de laine gris anthracite, coupe droite, sans revers',
    accords: ['v2', 'v4', 'h1', 's2', 'a5']
  },
  {
    id: 'p2',
    nom: 'Chino en coton',
    categorie: 'pantalon',
    slots: SLOTS_PAR_CATEGORIE.pantalon,
    matiere: 'Coton stretch',
    matieres: ['coton'],
    couleur: 'Beige',
    couleurs: ['beige'],
    coupe: 'slim',
    prix: 129,
    tailles: TAILLES_PANTALON,
    image: '/produits/chino-coton-beige.svg',
    gradient: 'linear-gradient(145deg, #CBB894, #94825F)',
    occasions: ['quotidien', 'bureau'],
    motsCles: ['décontracté', 'chino', 'quotidien', 'clair'],
    descriptionCourte:
      'Le chino beige en coton stretch : la base décontractée qui se met sous un blazer sans rougir.',
    descriptionRendu: 'un chino en coton beige, coupe ajustée, sans pinces',
    accords: ['v1', 'v2', 'h2', 's4', 'a5']
  },
  {
    id: 'p3',
    nom: 'Pantalon en lin',
    categorie: 'pantalon',
    slots: SLOTS_PAR_CATEGORIE.pantalon,
    matiere: 'Lin',
    matieres: ['lin'],
    couleur: 'Écru',
    couleurs: ['ecru', 'beige'],
    coupe: 'regular',
    prix: 159,
    tailles: TAILLES_PANTALON,
    image: '/produits/pantalon-lin-ecru.svg',
    gradient: 'linear-gradient(145deg, #E4DAC6, #B3A88F)',
    occasions: ['quotidien', 'mariage-invite'],
    motsCles: ['été', 'léger', 'clair', 'extérieur', 'méditerranéen'],
    descriptionCourte:
      "Lin écru, coupe fluide : le pantalon d'été qui laisse passer l'air et rattrape le soleil.",
    descriptionRendu: 'un pantalon en lin écru, coupe droite et fluide, au froissé naturel du lin',
    accords: ['v1', 'v3', 'h4', 's3']
  },
  {
    id: 'p4',
    nom: 'Pantalon à pinces en laine',
    categorie: 'pantalon',
    slots: SLOTS_PAR_CATEGORIE.pantalon,
    matiere: 'Laine',
    matieres: ['laine'],
    couleur: 'Bleu marine',
    couleurs: ['bleu', 'marine'],
    coupe: 'regular',
    prix: 199,
    tailles: TAILLES_PANTALON,
    image: '/produits/pantalon-laine-marine.svg',
    gradient: 'linear-gradient(145deg, #303E59, #182032)',
    occasions: ['bureau', 'ceremonie'],
    motsCles: ['pinces', 'habillé', 'ample', 'bureau'],
    descriptionCourte:
      'Deux pinces, taille haute et jambe droite : la coupe qui structure sans serrer.',
    descriptionRendu:
      'un pantalon de costume en laine bleu marine à deux pinces, taille haute, jambe droite',
    accords: ['v4', 'h1', 'm2', 's2', 'a5']
  },
  {
    id: 'p5',
    nom: 'Pantalon en velours côtelé',
    categorie: 'pantalon',
    slots: SLOTS_PAR_CATEGORIE.pantalon,
    matiere: 'Velours côtelé',
    matieres: ['velours', 'coton'],
    couleur: 'Brun tabac',
    couleurs: ['brun'],
    coupe: 'slim',
    prix: 179,
    tailles: TAILLES_PANTALON,
    image: '/produits/pantalon-velours-cotele-brun.svg',
    gradient: 'linear-gradient(145deg, #8A6A45, #4E3B26)',
    occasions: ['quotidien', 'bureau'],
    motsCles: ['hiver', 'velours', 'chaud', 'matière', 'décontracté'],
    descriptionCourte: "Velours côtelé brun tabac, côtes larges : la chaleur de l'hiver avec du relief.",
    descriptionRendu:
      'un pantalon en velours côtelé brun tabac aux côtes larges et visibles, coupe ajustée',
    accords: ['v4', 'm1', 'h5', 's2']
  },

  // ─────────────────────────────── Chemises
  {
    id: 'h1',
    nom: 'Chemise en popeline',
    categorie: 'chemise',
    slots: SLOTS_PAR_CATEGORIE.chemise,
    matiere: 'Popeline de coton',
    matieres: ['coton', 'popeline'],
    couleur: 'Blanc',
    couleurs: ['blanc'],
    coupe: 'slim',
    prix: 99,
    tailles: TAILLES_CHEMISE,
    image: '/produits/chemise-popeline-blanche.svg',
    gradient: 'linear-gradient(145deg, #FFFFFF, #D9D9D9)',
    occasions: ['bureau', 'mariage-invite', 'mariage-marie', 'ceremonie', 'soiree'],
    motsCles: ['blanc', 'classique', 'indispensable', 'col italien'],
    descriptionCourte:
      'La chemise blanche en popeline, col italien : celle qui manque toujours et qui va avec tout.',
    descriptionRendu:
      'une chemise en popeline de coton blanche à col italien, boutonnée, poignets simples',
    accords: ['c1', 'c3', 'a1', 'v2']
  },
  {
    id: 'h2',
    nom: 'Chemise en popeline',
    categorie: 'chemise',
    slots: SLOTS_PAR_CATEGORIE.chemise,
    matiere: 'Popeline de coton',
    matieres: ['coton', 'popeline'],
    couleur: 'Bleu ciel',
    couleurs: ['bleu', 'ciel'],
    coupe: 'slim',
    prix: 99,
    tailles: TAILLES_CHEMISE,
    image: '/produits/chemise-popeline-bleu-ciel.svg',
    gradient: 'linear-gradient(145deg, #C3D8EA, #8FAFC9)',
    occasions: ['bureau', 'quotidien', 'mariage-invite'],
    motsCles: ['bleu', 'classique', 'bureau', 'col italien'],
    descriptionCourte:
      'Bleu ciel en popeline : un peu moins formel que le blanc, un peu plus vivant sous un costume marine.',
    descriptionRendu:
      'une chemise en popeline de coton bleu ciel à col italien, boutonnée, poignets simples',
    accords: ['c1', 'v2', 'a1', 'p2']
  },
  {
    id: 'h3',
    nom: 'Chemise Oxford col boutonné',
    categorie: 'chemise',
    slots: SLOTS_PAR_CATEGORIE.chemise,
    matiere: 'Coton Oxford',
    matieres: ['coton'],
    couleur: 'Blanc',
    couleurs: ['blanc'],
    coupe: 'regular',
    prix: 109,
    tailles: TAILLES_CHEMISE,
    image: '/produits/chemise-oxford-blanche.svg',
    gradient: 'linear-gradient(145deg, #F6F5F1, #CFCDC6)',
    occasions: ['quotidien', 'bureau'],
    motsCles: ['décontracté', 'oxford', 'col boutonné', 'américain'],
    descriptionCourte:
      'Coton Oxford épais et col boutonné : la chemise décontractée qui tient debout toute seule.',
    descriptionRendu:
      'une chemise en coton Oxford blanc au tissage texturé, col américain boutonné, coupe droite',
    accords: ['v4', 'p2', 'm2', 's4']
  },
  {
    id: 'h4',
    nom: 'Chemise en lin',
    categorie: 'chemise',
    slots: SLOTS_PAR_CATEGORIE.chemise,
    matiere: 'Lin',
    matieres: ['lin'],
    couleur: 'Blanc',
    couleurs: ['blanc'],
    coupe: 'regular',
    prix: 119,
    tailles: TAILLES_CHEMISE,
    image: '/produits/chemise-lin-blanche.svg',
    gradient: 'linear-gradient(145deg, #FAF6EE, #D2CBBB)',
    occasions: ['quotidien', 'mariage-invite'],
    motsCles: ['été', 'lin', 'léger', 'extérieur', 'méditerranéen'],
    descriptionCourte:
      "Lin blanc au froissé assumé : la chemise d'été qui respire, col ouvert ou fermé.",
    descriptionRendu: 'une chemise en lin blanc au froissé naturel visible, col souple, coupe droite',
    accords: ['c3', 'c4', 'v3', 'p3']
  },
  {
    id: 'h5',
    nom: 'Chemise en lin',
    categorie: 'chemise',
    slots: SLOTS_PAR_CATEGORIE.chemise,
    matiere: 'Lin',
    matieres: ['lin'],
    couleur: 'Bleu denim',
    couleurs: ['bleu'],
    coupe: 'regular',
    prix: 119,
    tailles: TAILLES_CHEMISE,
    image: '/produits/chemise-lin-bleu.svg',
    gradient: 'linear-gradient(145deg, #7C93AB, #4C6076)',
    occasions: ['quotidien'],
    motsCles: ['été', 'lin', 'décontracté', 'bleu'],
    descriptionCourte:
      'Un lin bleu denim profond : la chemise du week-end qui passe aussi sous une veste.',
    descriptionRendu: 'une chemise en lin bleu denim au froissé naturel, col souple, coupe droite',
    accords: ['v4', 'p5', 'p2', 's3']
  },
  {
    id: 'h6',
    nom: 'Chemise de smoking à plastron',
    categorie: 'chemise',
    slots: SLOTS_PAR_CATEGORIE.chemise,
    matiere: 'Coton piqué',
    matieres: ['coton'],
    couleur: 'Blanc',
    couleurs: ['blanc'],
    coupe: 'slim',
    prix: 149,
    tailles: TAILLES_CHEMISE,
    image: '/produits/chemise-smoking-plastron.svg',
    gradient: 'linear-gradient(145deg, #FFFFFF, #CFCFCF)',
    occasions: ['soiree', 'mariage-marie', 'ceremonie'],
    motsCles: ['smoking', 'plastron', 'col cassé', 'gala', 'black tie'],
    descriptionCourte:
      'Plastron piqué et col cassé : la seule chemise qui se porte vraiment avec un smoking.',
    descriptionRendu:
      'une chemise de smoking blanche à plastron en coton piqué et col cassé, boutons de manchette',
    accords: ['c7', 'a3', 'c8']
  },

  // ─────────────────────────────── Maille
  {
    id: 'm1',
    nom: 'Pull col rond en mérinos',
    categorie: 'maille',
    slots: SLOTS_PAR_CATEGORIE.maille,
    matiere: 'Laine mérinos',
    matieres: ['laine', 'merinos', 'maille'],
    couleur: 'Bleu marine',
    couleurs: ['bleu', 'marine'],
    coupe: 'slim',
    prix: 139,
    tailles: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '/produits/pull-merinos-marine.svg',
    gradient: 'linear-gradient(145deg, #2F3D57, #191F30)',
    occasions: ['quotidien', 'bureau'],
    motsCles: ['hiver', 'chaud', 'maille', 'fin', 'décontracté'],
    descriptionCourte:
      "Mérinos fin, col rond : assez fin pour passer sous une veste, assez chaud pour s'en passer.",
    descriptionRendu: 'un pull fin en laine mérinos bleu marine à col rond, maille serrée',
    accords: ['v4', 'p1', 'p5', 's2']
  },
  {
    id: 'm2',
    nom: 'Gilet sans manches en maille',
    categorie: 'maille',
    slots: SLOTS_PAR_CATEGORIE.maille,
    matiere: 'Laine mérinos',
    matieres: ['laine', 'merinos', 'maille'],
    couleur: 'Gris perle',
    couleurs: ['gris'],
    coupe: 'slim',
    prix: 119,
    tailles: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '/produits/gilet-maille-gris.svg',
    gradient: 'linear-gradient(145deg, #B4B6BA, #7C7E84)',
    occasions: ['bureau', 'quotidien'],
    motsCles: ['gilet', 'maille', 'superposition', 'bureau'],
    descriptionCourte:
      'Le gilet sans manches gris perle : la troisième pièce qui habille une chemise seule.',
    descriptionRendu:
      'un gilet sans manches en maille de laine mérinos gris perle, col en V, porté sur une chemise',
    accords: ['h1', 'h3', 'p4', 'p1']
  },
  {
    id: 'm3',
    nom: 'Polo en maille de coton',
    categorie: 'maille',
    slots: SLOTS_PAR_CATEGORIE.maille,
    matiere: 'Maille de coton',
    matieres: ['coton', 'maille'],
    couleur: 'Écru',
    couleurs: ['ecru', 'beige'],
    coupe: 'slim',
    prix: 129,
    tailles: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '/produits/polo-maille-ecru.svg',
    gradient: 'linear-gradient(145deg, #EDE4D2, #BCB19A)',
    occasions: ['quotidien', 'mariage-invite'],
    motsCles: ['été', 'polo', 'maille', 'décontracté', 'clair'],
    descriptionCourte:
      "Polo en maille écru, col souple : la pièce qui rend un costume d'été immédiatement décontracté.",
    descriptionRendu: 'un polo en maille de coton écru à col souple ouvert, manches courtes',
    accords: ['c3', 'v1', 'p3', 's3']
  },

  // ─────────────────────────────── Chaussures
  {
    id: 's1',
    nom: 'Derby en cuir',
    categorie: 'chaussures',
    slots: SLOTS_PAR_CATEGORIE.chaussures,
    matiere: 'Cuir de veau',
    matieres: ['cuir'],
    couleur: 'Noir',
    couleurs: ['noir'],
    coupe: null,
    prix: 289,
    tailles: TAILLES_CHAUSSURE,
    image: '/produits/derby-cuir-noir.svg',
    gradient: 'linear-gradient(145deg, #2A2A2C, #0E0E10)',
    occasions: ['bureau', 'ceremonie', 'soiree', 'mariage-marie'],
    motsCles: ['habillé', 'noir', 'classique', 'cuir'],
    descriptionCourte:
      'Derby noir en cuir de veau, cousu trépointe : la chaussure qui ne se fait jamais remarquer, dans le bon sens.',
    descriptionRendu: 'une paire de derbys en cuir de veau noir lisse, à lacets, semelle en cuir',
    accords: ['c1', 'c5', 'c7', 'a6']
  },
  {
    id: 's2',
    nom: 'Oxford en cuir',
    categorie: 'chaussures',
    slots: SLOTS_PAR_CATEGORIE.chaussures,
    matiere: 'Cuir de veau',
    matieres: ['cuir'],
    couleur: 'Brun acajou',
    couleurs: ['brun'],
    coupe: null,
    prix: 309,
    tailles: TAILLES_CHAUSSURE,
    image: '/produits/oxford-cuir-brun.svg',
    gradient: 'linear-gradient(145deg, #7A4B32, #40261A)',
    occasions: ['bureau', 'mariage-invite', 'ceremonie'],
    motsCles: ['habillé', 'brun', 'patine', 'cuir'],
    descriptionCourte:
      'Oxford acajou à la patine profonde : plus chaleureux que le noir, aussi habillé.',
    descriptionRendu:
      'une paire de richelieus Oxford en cuir brun acajou patiné, à lacets, bout légèrement fleuri',
    accords: ['c1', 'c6', 'p1', 'a5']
  },
  {
    id: 's3',
    nom: 'Mocassin en daim',
    categorie: 'chaussures',
    slots: SLOTS_PAR_CATEGORIE.chaussures,
    matiere: 'Daim',
    matieres: ['daim', 'cuir'],
    couleur: 'Taupe',
    couleurs: ['beige', 'brun'],
    coupe: null,
    prix: 259,
    tailles: TAILLES_CHAUSSURE,
    image: '/produits/mocassin-daim-taupe.svg',
    gradient: 'linear-gradient(145deg, #A3907A, #6B5C48)',
    occasions: ['quotidien', 'mariage-invite'],
    motsCles: ['été', 'daim', 'décontracté', 'sans lacets', 'clair'],
    descriptionCourte: "Mocassin en daim taupe, sans lacets : la chaussure d'été des costumes en lin.",
    descriptionRendu: 'une paire de mocassins en daim taupe mat, sans lacets, semelle fine',
    accords: ['c3', 'c4', 'p3', 'v1']
  },
  {
    id: 's4',
    nom: 'Sneaker en cuir',
    categorie: 'chaussures',
    slots: SLOTS_PAR_CATEGORIE.chaussures,
    matiere: 'Cuir de veau',
    matieres: ['cuir'],
    couleur: 'Blanc',
    couleurs: ['blanc'],
    coupe: null,
    prix: 199,
    tailles: TAILLES_CHAUSSURE,
    image: '/produits/sneaker-cuir-blanc.svg',
    gradient: 'linear-gradient(145deg, #FFFFFF, #C9C9C9)',
    occasions: ['quotidien'],
    motsCles: ['décontracté', 'blanc', 'sneaker', 'moderne'],
    descriptionCourte:
      'Sneaker blanche en cuir lisse, silhouette minimale : le décontracté qui reste net.',
    descriptionRendu: 'une paire de sneakers minimalistes en cuir blanc lisse, semelle blanche fine',
    accords: ['p2', 'h3', 'v1', 'm3']
  },

  // ─────────────────────────────── Accessoires
  {
    id: 'a1',
    nom: 'Cravate en grenadine de soie',
    categorie: 'accessoire',
    slots: ['cou'],
    matiere: 'Grenadine de soie',
    matieres: ['soie'],
    couleur: 'Bleu marine',
    couleurs: ['bleu', 'marine'],
    coupe: null,
    prix: 79,
    tailles: TAILLE_UNIQUE,
    image: '/produits/cravate-grenadine-marine.svg',
    gradient: 'linear-gradient(145deg, #2C3A55, #141B29)',
    occasions: ['bureau', 'mariage-invite', 'ceremonie'],
    motsCles: ['cravate', 'soie', 'texture', 'classique'],
    descriptionCourte:
      'Grenadine tissée main : la seule cravate unie qui a du relief. Elle va avec tous les costumes.',
    descriptionRendu: 'une cravate en grenadine de soie bleu marine au tissage texturé',
    accords: ['c1', 'h1', 'v2']
  },
  {
    id: 'a2',
    nom: 'Cravate en laine',
    categorie: 'accessoire',
    slots: ['cou'],
    matiere: 'Laine',
    matieres: ['laine'],
    couleur: 'Bordeaux',
    couleurs: ['bordeaux', 'brun'],
    coupe: null,
    prix: 69,
    tailles: TAILLE_UNIQUE,
    image: '/produits/cravate-laine-bordeaux.svg',
    gradient: 'linear-gradient(145deg, #6E2732, #3A1219)',
    occasions: ['bureau', 'quotidien'],
    motsCles: ['cravate', 'laine', 'hiver', 'mat', 'bordeaux'],
    descriptionCourte:
      "Laine bordeaux au tombé mat : la cravate d'hiver, plus douce qu'une soie sur une flanelle.",
    descriptionRendu: 'une cravate en laine bordeaux au tombé mat et bout droit',
    accords: ['c5', 'c6', 'v4']
  },
  {
    id: 'a3',
    nom: 'Nœud papillon en soie',
    categorie: 'accessoire',
    slots: ['cou'],
    matiere: 'Soie',
    matieres: ['soie'],
    couleur: 'Noir',
    couleurs: ['noir'],
    coupe: null,
    prix: 59,
    tailles: TAILLE_UNIQUE,
    image: '/produits/noeud-papillon-soie-noir.svg',
    gradient: 'linear-gradient(145deg, #26262A, #0C0C0E)',
    occasions: ['soiree', 'mariage-marie', 'ceremonie'],
    motsCles: ['nœud papillon', 'smoking', 'gala', 'black tie', 'soie'],
    descriptionCourte:
      'Nœud papillon en soie noire, à nouer soi-même : indispensable avec un smoking.',
    descriptionRendu: 'un nœud papillon en soie noire satinée, forme papillon classique',
    accords: ['c7', 'h6', 'c8']
  },
  {
    id: 'a4',
    nom: 'Pochette en lin',
    categorie: 'accessoire',
    slots: ['poche'],
    matiere: 'Lin',
    matieres: ['lin'],
    couleur: 'Blanc',
    couleurs: ['blanc'],
    coupe: null,
    prix: 35,
    tailles: TAILLE_UNIQUE,
    image: '/produits/pochette-lin-blanche.svg',
    gradient: 'linear-gradient(145deg, #FDFBF6, #D6D0C2)',
    occasions: ['mariage-invite', 'mariage-marie', 'ceremonie', 'soiree', 'bureau'],
    motsCles: ['pochette', 'lin', 'blanc', 'détail'],
    descriptionCourte:
      'Pochette en lin blanc à bords roulottés : le détail qui finit une veste, sans effort.',
    descriptionRendu:
      'une pochette de costume en lin blanc, pliée droite et glissée dans la poche poitrine de la veste',
    accords: ['c1', 'c3', 'c7', 'v2']
  },
  {
    id: 'a5',
    nom: 'Ceinture en cuir',
    categorie: 'accessoire',
    slots: ['taille'],
    matiere: 'Cuir de veau',
    matieres: ['cuir'],
    couleur: 'Brun',
    couleurs: ['brun'],
    coupe: null,
    prix: 89,
    tailles: ['85', '90', '95', '100', '105'],
    image: '/produits/ceinture-cuir-brun.svg',
    gradient: 'linear-gradient(145deg, #7A5334, #3F2B1B)',
    occasions: ['bureau', 'quotidien', 'mariage-invite'],
    motsCles: ['ceinture', 'cuir', 'brun'],
    descriptionCourte:
      'Ceinture en cuir brun à boucle argent : à accorder aux chaussures, jamais au hasard.',
    descriptionRendu: 'une ceinture en cuir brun lisse à boucle argentée rectangulaire',
    accords: ['s2', 'p1', 'p2', 'c6']
  },
  {
    id: 'a6',
    nom: 'Ceinture en cuir',
    categorie: 'accessoire',
    slots: ['taille'],
    matiere: 'Cuir de veau',
    matieres: ['cuir'],
    couleur: 'Noir',
    couleurs: ['noir'],
    coupe: null,
    prix: 89,
    tailles: ['85', '90', '95', '100', '105'],
    image: '/produits/ceinture-cuir-noir.svg',
    gradient: 'linear-gradient(145deg, #2B2B2D, #101012)',
    occasions: ['bureau', 'ceremonie', 'soiree'],
    motsCles: ['ceinture', 'cuir', 'noir'],
    descriptionCourte:
      'Ceinture en cuir noir à boucle argent : le pendant du derby noir, pour les tenues formelles.',
    descriptionRendu: 'une ceinture en cuir noir lisse à boucle argentée rectangulaire',
    accords: ['s1', 'c1', 'c5', 'p1']
  }
]

// ─────────────────────────────── Dérivés (matching, prompts, UI)

/** Toutes les matières du catalogue — liste blanche des sorties du modèle. */
export const VOCABULAIRE_MATIERES: string[] = [
  ...new Set(CATALOGUE.flatMap((a) => a.matieres))
].sort()

/** Toutes les familles de couleur du catalogue — liste blanche. */
export const VOCABULAIRE_COULEURS: string[] = [
  ...new Set(CATALOGUE.flatMap((a) => a.couleurs))
].sort()

/** Tous les mots-clés du catalogue — liste blanche. */
export const VOCABULAIRE_MOTS_CLES: string[] = [
  ...new Set(CATALOGUE.flatMap((a) => a.motsCles))
].sort()

/** Ordre d'affichage des familles dans la sélection. */
export const ORDRE_CATEGORIES: Categorie[] = [
  'costume',
  'veste',
  'pantalon',
  'chemise',
  'maille',
  'chaussures',
  'accessoire'
]

const INDEX = new Map(CATALOGUE.map((a) => [a.id, a]))

/** Article par identifiant. Lève si l'id n'existe pas (erreur de développement). */
export function parId(id: string): Article {
  const article = INDEX.get(id)
  if (!article) throw new Error(`Article inconnu : ${id}`)
  return article
}

/** Article par identifiant, ou undefined (listes d'accords tolérantes). */
export function parIdSafe(id: string): Article | undefined {
  return INDEX.get(id)
}

/** Regroupe une liste d'articles par famille, dans l'ordre d'affichage. */
export function grouperParCategorie(
  articles: Article[]
): { categorie: Categorie; articles: Article[] }[] {
  const groupes: { categorie: Categorie; articles: Article[] }[] = []
  for (const categorie of ORDRE_CATEGORIES) {
    const membres = articles.filter((a) => a.categorie === categorie)
    if (membres.length > 0) groupes.push({ categorie, articles: membres })
  }
  return groupes
}
