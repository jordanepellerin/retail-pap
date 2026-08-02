import type { Oeuvre, Tag } from '../types'

/**
 * Catalogue des œuvres — uniquement les artistes dont les photos officielles
 * sont chargées dans public/artistes/. Aucune image externe, aucun placeholder.
 *
 * Métadonnées machine (`dims`, `motsCles`, `couleurs`, `descriptionCourte`) :
 * saisies à la main, elles alimentent le scoring code (src/lib/matching.ts)
 * et les prompts d'analyse (api/analyze.ts).
 */
export const CATALOGUE: Oeuvre[] = [
  // ───────────────────────── SCULPTURES
  // Bruno Catalano
  {
    id: 's1',
    artiste: 'Bruno Catalano',
    titre: 'Cristian',
    medium: 'Bronze',
    dimensions: 'H 100 cm',
    prix: '22 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(145deg, #8A7B5C, #3A3225)',
    image: '/artistes/bruno%20catalano/BRUNO-CATALANO-CRISTIAN-H.-100-cm-Bronze-%E2%80%93-2.jpg',
    dims: { h: 100, l: null, p: null },
    orientation: 'volume',
    motsCles: ['voyageur', 'valise', 'homme qui marche', 'bronze fragmenté', 'silhouette', 'voyage'],
    couleurs: ['bronze', 'orange'],
    descriptionCourte: 'Voyageur au torse évidé, valise à la main, en marche.'
  },
  {
    id: 's2',
    artiste: 'Bruno Catalano',
    titre: 'Sarah',
    medium: 'Bronze',
    dimensions: 'H 100 cm',
    prix: '18 500 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(150deg, #6E5F45, #241E14)',
    image: '/artistes/bruno%20catalano/BRUNO-CATALANO-SARAH-H.-100-cm-Bronze.jpg',
    dims: { h: 100, l: null, p: null },
    orientation: 'volume',
    motsCles: ['voyageuse', 'valise', 'femme qui marche', 'bronze fragmenté', 'silhouette', 'voyage'],
    couleurs: ['bronze'],
    descriptionCourte: 'Voyageuse fragmentée portant sa valise, silhouette en mouvement.'
  },
  {
    id: 's3',
    artiste: 'Bruno Catalano',
    titre: 'Hubert au Bandeau',
    medium: 'Bronze',
    dimensions: 'H 85 cm',
    prix: '16 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(140deg, #A2916E, #4A3F2C)',
    image: '/artistes/bruno%20catalano/HUBERT-AU-BANDEAU-%E2%80%93-2-1.jpg',
    dims: { h: 85, l: null, p: null },
    orientation: 'volume',
    motsCles: ['voyageur', 'valise', 'homme qui marche', 'bronze fragmenté', 'bandeau', 'voyage'],
    couleurs: ['bronze'],
    descriptionCourte: 'Voyageur au bandeau, corps fragmenté et valise en bronze.'
  },
  {
    id: 's4',
    artiste: 'Bruno Catalano',
    titre: 'Raphaël',
    medium: 'Bronze',
    dimensions: 'H 140 cm',
    prix: '38 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(145deg, #9A8B68, #3A3025)',
    image: '/artistes/bruno%20catalano/RAPHAEL-H.140-cm.jpg',
    dims: { h: 140, l: null, p: null },
    orientation: 'volume',
    motsCles: ['voyageur', 'valise', 'homme qui marche', 'bronze fragmenté', 'grand format', 'voyage'],
    couleurs: ['bronze'],
    descriptionCourte: 'Grand voyageur fragmenté à la valise, présence monumentale.'
  },
  // Andrea Roggi
  {
    id: 's5',
    artiste: 'Andrea Roggi',
    titre: 'Destinati ad Amarsi',
    medium: 'Bronze',
    dimensions: 'H 105 × L 90 × P 72 cm',
    prix: '28 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(160deg, #7C9A68, #221C12)',
    image: '/artistes/andrea%20roggi/ANDREA-ROGGI-DESTINATI-AD-AMARSI-105-x-90-x-72-cm.jpg',
    dims: { h: 105, l: 90, p: 72 },
    orientation: 'volume',
    motsCles: ['couple', 'amour', 'étreinte', 'cercle', 'bronze'],
    couleurs: ['bronze', 'vert'],
    descriptionCourte: 'Couple enlacé inscrit dans un cercle de bronze.'
  },
  {
    id: 's6',
    artiste: 'Andrea Roggi',
    titre: "Dove Nasce l'Amore",
    medium: 'Bronze',
    dimensions: 'H 83 × L 53 × P 45 cm',
    prix: '19 500 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(155deg, #6E8B5A, #24301C)',
    image: '/artistes/andrea%20roggi/ANDREA-ROGGI-DOVE-NASCE-LAMORE-83-x-53-x-45-cm.jpg',
    dims: { h: 83, l: 53, p: 45 },
    orientation: 'volume',
    motsCles: ['couple', 'amour', 'étreinte', 'famille', 'bronze'],
    couleurs: ['bronze', 'vert'],
    descriptionCourte: "Naissance de l'amour : deux figures unies en bronze patiné."
  },
  {
    id: 's7',
    artiste: 'Andrea Roggi',
    titre: 'Radici di Luce',
    medium: 'Bronze',
    dimensions: 'H 109 × L 82 × P 74 cm',
    prix: '32 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(150deg, #8AA06F, #3A4A2C)',
    image: '/artistes/andrea%20roggi/ANDREA-ROGGI-RADICI-DI-LUCE-109-x-82-x-74-cm.jpg',
    dims: { h: 109, l: 82, p: 74 },
    orientation: 'volume',
    motsCles: ['arbre de vie', 'racines', 'nature', 'cercle', 'bronze'],
    couleurs: ['bronze', 'vert'],
    descriptionCourte: "Arbre de vie aux racines de lumière, couronne circulaire."
  },
  {
    id: 's8',
    artiste: 'Andrea Roggi',
    titre: 'Un Legame Oltre il Visibile',
    medium: 'Bronze',
    dimensions: 'H 64 × L 49 × P 37 cm',
    prix: '14 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(155deg, #7A9060, #2A3820)',
    image: '/artistes/andrea%20roggi/ANDREA-ROGGI-UN-LEGAME-OLTRE-IL-VISIBILE-64-x-49-x-37-cm.jpg',
    dims: { h: 64, l: 49, p: 37 },
    orientation: 'volume',
    motsCles: ['couple', 'amour', 'lien', 'famille', 'bronze'],
    couleurs: ['bronze', 'vert'],
    descriptionCourte: 'Lien invisible entre deux êtres, bronze intimiste.'
  },
  // Paul Beckrich
  {
    id: 's9',
    artiste: 'Paul Beckrich',
    titre: 'Dame de Chine Bleue',
    medium: 'Bronze doré à l’or fin',
    dimensions: 'H 55 cm',
    prix: '9 800 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(145deg, #C9A96E, #7A5A2E)',
    image: '/artistes/paul%20beckrich/BECKRICH-DAME-DE-CHINE-BLEUE-H.55-cm-Bronze-dore-a-lor-fin.jpg',
    dims: { h: 55, l: null, p: null },
    orientation: 'volume',
    motsCles: ['buste', 'féminin', 'doré', 'visage', 'chine'],
    couleurs: ['doré', 'bleu'],
    descriptionCourte: 'Buste féminin doré à l’or fin, visage de Chine bleue.'
  },
  {
    id: 's10',
    artiste: 'Paul Beckrich',
    titre: 'Noble Dame de Chine',
    medium: 'Raku',
    dimensions: 'H 55 cm',
    prix: '7 500 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(150deg, #D4B87A, #5A3E1E)',
    image: '/artistes/paul%20beckrich/BECKRICH-NOBLE-DAME-DE-CHINE-H.-55-cm-Raku.jpg',
    dims: { h: 55, l: null, p: null },
    orientation: 'volume',
    motsCles: ['buste', 'féminin', 'raku', 'céramique', 'visage', 'chine'],
    couleurs: ['doré', 'brun'],
    descriptionCourte: 'Noble buste féminin en raku, craquelures précieuses.'
  },
  {
    id: 's11',
    artiste: 'Paul Beckrich',
    titre: 'Samouraï Rouge',
    medium: 'Bronze doré à l’or fin',
    dimensions: 'H 55 cm',
    prix: '10 500 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(145deg, #C04040, #6A1010)',
    image: '/artistes/paul%20beckrich/BECKRICH-SAMOURAI-ROUGE-H.55-cm-Bronze-dore-a-lor-fin.jpg',
    dims: { h: 55, l: null, p: null },
    orientation: 'volume',
    motsCles: ['buste', 'samouraï', 'doré', 'guerrier', 'japon'],
    couleurs: ['rouge', 'doré'],
    descriptionCourte: 'Buste de samouraï rouge et or, force et sérénité.'
  },
  // Lorenzo Quinn
  {
    id: 's12',
    artiste: 'Lorenzo Quinn',
    titre: 'Cœur Bleu',
    medium: 'Bronze',
    dimensions: 'H 90 cm',
    prix: '26 000 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(145deg, #3A6EA5, #12283F)',
    image: '/artistes/lorenzo%20quinn/COEUR-BLEU.jpg',
    dims: { h: 90, l: null, p: null },
    orientation: 'volume',
    motsCles: ['cœur', 'mains', 'amour', 'émotion', 'bronze'],
    couleurs: ['bleu', 'bronze'],
    descriptionCourte: 'Cœur bleu porté par des mains de bronze.'
  },
  {
    id: 's13',
    artiste: 'Lorenzo Quinn',
    titre: 'I Give You My Heart (III)',
    medium: 'Bronze',
    dimensions: 'H 90 cm',
    prix: '29 500 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(150deg, #8A6E4A, #2A1E10)',
    image: '/artistes/lorenzo%20quinn/I-Give-You-My-Heart-III-Bronze-90cm.jpg',
    dims: { h: 90, l: null, p: null },
    orientation: 'volume',
    motsCles: ['cœur', 'mains', 'amour', 'don', 'émotion'],
    couleurs: ['bronze'],
    descriptionCourte: 'Main offrant un cœur — le don de soi en bronze.'
  },
  {
    id: 's14',
    artiste: 'Lorenzo Quinn',
    titre: 'Infinite Emotions',
    medium: 'Aluminium',
    dimensions: 'H 37 cm',
    prix: '13 500 €',
    tag: 'sculpture',
    gradient: 'linear-gradient(155deg, #9AA0A6, #3A3E44)',
    image: '/artistes/lorenzo%20quinn/Infinite-Emotions-37cm-alu-001.jpg',
    dims: { h: 37, l: null, p: null },
    orientation: 'volume',
    motsCles: ['mains', 'infini', 'émotion', 'aluminium', 'petit format'],
    couleurs: ['argent'],
    descriptionCourte: 'Mains entrelacées en boucle infinie, aluminium poli.'
  },
  // ───────────────────────── PEINTURES
  // Al Freno
  {
    id: 'p1',
    artiste: 'Al Freno',
    titre: 'I Only Have Eyes For You',
    medium: 'Huile extra-fine sur toile de lin',
    dimensions: '150 × 150 cm',
    prix: '8 200 €',
    tag: 'peinture',
    gradient: 'linear-gradient(120deg, #2C3E50, #3498DB, #ECF0F1)',
    image: '/artistes/al%20freno/AL-FRENO-I-ONLY-HAVE-EYES-FOR-YOU-150-x-150-cm-Blockx-and-Williamsburg-extra-fine-oil-on-linen-canvas.jpg',
    dims: { h: 150, l: 150, p: null },
    orientation: 'carre',
    motsCles: ['figuratif', 'coloré', 'pop', 'regard', 'grand format'],
    couleurs: ['bleu', 'blanc'],
    descriptionCourte: 'Grand format figuratif pop, regard intense aux bleus profonds.'
  },
  {
    id: 'p2',
    artiste: 'Al Freno',
    titre: 'Jump for Joy',
    medium: 'Huile sur toile',
    dimensions: '120 × 120 cm',
    prix: '6 400 €',
    tag: 'peinture',
    gradient: 'linear-gradient(125deg, #1F3346, #4AA3D0)',
    image: '/artistes/al%20freno/JUMP-FOR-JOY-120-x-120-cm.jpg',
    dims: { h: 120, l: 120, p: null },
    orientation: 'carre',
    motsCles: ['figuratif', 'coloré', 'pop', 'joie', 'mouvement'],
    couleurs: ['bleu'],
    descriptionCourte: 'Saut de joie — énergie pop aux bleus lumineux.'
  },
  {
    id: 'p3',
    artiste: 'Al Freno',
    titre: 'Wild World',
    medium: 'Huile extra-fine sur toile de lin',
    dimensions: '150 × 150 cm',
    prix: '7 800 €',
    tag: 'peinture',
    gradient: 'linear-gradient(120deg, #274156, #5FB0D8)',
    image: '/artistes/al%20freno/WILD-WORLD-150-x-150-cm-Blockx-and-Williamsburg-extra-fine-oil-on-linen-canvas-%E2%80%93-1.jpg',
    dims: { h: 150, l: 150, p: null },
    orientation: 'carre',
    motsCles: ['figuratif', 'coloré', 'pop', 'nature', 'grand format'],
    couleurs: ['bleu'],
    descriptionCourte: 'Monde sauvage en grand format, huile aux bleus océan.'
  },
  {
    id: 'p4',
    artiste: 'Al Freno',
    titre: 'Your Love Is King',
    medium: 'Huile sur toile',
    dimensions: '120 × 120 cm',
    prix: '5 900 €',
    tag: 'peinture',
    gradient: 'linear-gradient(120deg, #1A2A38, #3A7A9C)',
    image: '/artistes/al%20freno/YOUR-LOVE-IS-KING-120-x-120-cm.jpg',
    dims: { h: 120, l: 120, p: null },
    orientation: 'carre',
    motsCles: ['figuratif', 'coloré', 'pop', 'amour'],
    couleurs: ['bleu'],
    descriptionCourte: 'Déclaration pop et colorée sur toile carrée.'
  },
  // Kiko
  {
    id: 'p5',
    artiste: 'Kiko',
    titre: "À Fleur d'Origami",
    medium: 'Peinture au couteau sur toile de lin',
    dimensions: '120 × 120 cm',
    prix: '4 500 €',
    tag: 'peinture',
    gradient: 'linear-gradient(120deg, #FF6B9D, #C44D8B, #1A0A12)',
    image: '/artistes/kiko/KIKO-A-FLEUR-DORIGAMI-120-x-120-cm-Palette-knife-painting-on-linen-canvas.jpg',
    dims: { h: 120, l: 120, p: null },
    orientation: 'carre',
    motsCles: ['couteau', 'matière', 'origami', 'fleur', 'multicolore'],
    couleurs: ['rose', 'multicolore'],
    descriptionCourte: "Profil à fleur d'origami, éclats multicolores au couteau."
  },
  {
    id: 'p6',
    artiste: 'Kiko',
    titre: 'À tes côtés',
    medium: 'Peinture au couteau sur toile de lin',
    dimensions: '100 × 100 cm',
    prix: '3 600 €',
    tag: 'peinture',
    gradient: 'linear-gradient(125deg, #FF8FB0, #C4548B)',
    image: '/artistes/kiko/KIKO-A-TES-COTES-100-x-100-cm-Peinture-au-couteau-sur-toile-de-lin.jpg',
    dims: { h: 100, l: 100, p: null },
    orientation: 'carre',
    motsCles: ['couteau', 'matière', 'couple', 'tendresse'],
    couleurs: ['rose'],
    descriptionCourte: 'Deux présences côte à côte, matière rose au couteau.'
  },
  {
    id: 'p7',
    artiste: 'Kiko',
    titre: 'Fusion',
    medium: 'Peinture au couteau',
    dimensions: '120 × 120 cm',
    prix: '4 200 €',
    tag: 'peinture',
    gradient: 'linear-gradient(120deg, #E8608A, #A83070)',
    image: '/artistes/kiko/KIKO-FUSION-120-x-120-cm.jpg',
    dims: { h: 120, l: 120, p: null },
    orientation: 'carre',
    motsCles: ['couteau', 'matière', 'couple', 'fusion'],
    couleurs: ['rose', 'rouge'],
    descriptionCourte: 'Fusion de deux êtres, reliefs vibrants au couteau.'
  },
  {
    id: 'p8',
    artiste: 'Kiko',
    titre: 'Gardien de Lumière',
    medium: 'Peinture au couteau',
    dimensions: '120 × 120 cm',
    prix: '4 800 €',
    tag: 'peinture',
    gradient: 'linear-gradient(125deg, #FF70A0, #B03870)',
    image: '/artistes/kiko/KIKO-GARDIEN-DE-LUMIERE-120-x-120-cm-Peinture-au-couteau.jpg',
    dims: { h: 120, l: 120, p: null },
    orientation: 'carre',
    motsCles: ['couteau', 'matière', 'lumière', 'gardien'],
    couleurs: ['rose', 'doré'],
    descriptionCourte: 'Gardien de lumière, matière irisée sculptée au couteau.'
  },
  // Harding Meyer
  {
    id: 'p9',
    artiste: 'Harding Meyer',
    titre: 'Portrait nº 4 (2026)',
    medium: 'Huile sur toile',
    dimensions: '110 × 90 cm',
    prix: '12 000 €',
    tag: 'peinture',
    gradient: 'linear-gradient(135deg, #5A3E2B, #C49A72)',
    image: '/artistes/harding%20meyer/4-2026-110-x-90-cm-Huile-sur-toile.jpg',
    dims: { h: 110, l: 90, p: null },
    orientation: 'portrait',
    motsCles: ['portrait', 'visage', 'regard', 'contemporain'],
    couleurs: ['brun', 'chair'],
    descriptionCourte: 'Portrait contemporain au regard suspendu, tons chauds.'
  },
  {
    id: 'p10',
    artiste: 'Harding Meyer',
    titre: 'Portrait nº 8',
    medium: 'Huile sur toile',
    dimensions: '160 × 200 cm',
    prix: '18 000 €',
    tag: 'peinture',
    gradient: 'linear-gradient(140deg, #3A2C1E, #B08050)',
    image: '/artistes/harding%20meyer/8-160-x-200-cm-Huile-sur-toile.jpg',
    dims: { h: 160, l: 200, p: null },
    orientation: 'paysage',
    motsCles: ['portrait', 'visage', 'regard', 'grand format'],
    couleurs: ['brun', 'chair'],
    descriptionCourte: 'Très grand visage à l’huile, présence magnétique.'
  },
  {
    id: 'p11',
    artiste: 'Harding Meyer',
    titre: 'Portrait nº 12',
    medium: 'Huile sur toile',
    dimensions: '150 × 120 cm',
    prix: '15 500 €',
    tag: 'peinture',
    gradient: 'linear-gradient(135deg, #4A3422, #C09060)',
    image: '/artistes/harding%20meyer/HARDING-MEYER-12-150-x-120-cm-Oil-on-canvas.jpg',
    dims: { h: 150, l: 120, p: null },
    orientation: 'portrait',
    motsCles: ['portrait', 'visage', 'regard', 'grand format'],
    couleurs: ['brun', 'chair'],
    descriptionCourte: 'Portrait vertical grand format, matière picturale dense.'
  },
  {
    id: 'p12',
    artiste: 'Harding Meyer',
    titre: 'Portrait nº 15',
    medium: 'Huile sur toile',
    dimensions: '160 × 200 cm',
    prix: '20 000 €',
    tag: 'peinture',
    gradient: 'linear-gradient(140deg, #2E1E12, #A07040)',
    image: '/artistes/harding%20meyer/HARDING-MEYER-15-160-x-200-cm-Oil-on-canvas.jpg',
    dims: { h: 160, l: 200, p: null },
    orientation: 'paysage',
    motsCles: ['portrait', 'visage', 'regard', 'grand format'],
    couleurs: ['brun', 'chair'],
    descriptionCourte: 'Visage monumental à l’huile, cadrage cinématographique.'
  }
]

/** Noms exacts des artistes du catalogue (liste blanche pour l'analyse IA). */
export const ARTISTES: string[] = [...new Set(CATALOGUE.map((o) => o.artiste))]

/**
 * Présentation éditoriale (1–2 phrases) de chaque artiste, affichée à l'étape
 * intermédiaire « Les artistes retenus » avant la sélection d'œuvres. Écrites à
 * la main : mentionnent l'œuvre / le motif signature pour ancrer l'introduction.
 */
export const BIO_ARTISTES: Record<string, string> = {
  'Bruno Catalano':
    'Sculpteur mondialement reconnu pour ses « Voyageurs » en bronze au corps fragmenté, dont la célèbre composition Le Voyageur. Ses personnages, valise à la main, semblent suspendus entre départ et souvenir.',
  'Andrea Roggi':
    'Maître italien de la sculpture en bronze, célébré pour ses arbres de vie et ses couples enlacés inscrits dans le cercle. Son œuvre chante le lien, la nature et la transmission.',
  'Paul Beckrich':
    'Sculpteur du bronze doré à l’or fin et du raku, il façonne des bustes précieux — dames de Chine, samouraïs — où la matière noble rencontre la sérénité du visage.',
  'Lorenzo Quinn':
    'Sculpteur des mains et des émotions, mondialement connu pour ses œuvres monumentales sur l’amour et le lien humain. Ses bronzes traduisent en gestes ce qui échappe aux mots.',
  'Al Freno':
    'Peintre figuratif à l’univers pop et coloré, il compose de grands formats à l’huile aux bleus profonds où le regard et l’énergie tiennent le premier rôle.',
  Kiko: 'Peintre au couteau, il sculpte la lumière et la couleur en épaisseur sur la toile de lin. Ses profils et ses couples vibrent d’une matière multicolore et sensible.',
  'Harding Meyer':
    'Portraitiste contemporain de renom, il peint à l’huile des visages monumentaux au regard suspendu, d’une présence magnétique et cinématographique.'
}

/**
 * Mots-clés par artiste (union des mots-clés de ses œuvres) — injectés dans le
 * prompt d'analyse pour ancrer la reconnaissance « description → artiste »
 * (ex. « un homme avec une valise qui marche » → Bruno Catalano).
 */
export const MOTS_CLES_ARTISTES: Record<string, string[]> = CATALOGUE.reduce(
  (acc, o) => {
    acc[o.artiste] = [...new Set([...(acc[o.artiste] ?? []), ...o.motsCles])]
    return acc
  },
  {} as Record<string, string[]>
)

/** Vocabulaire contrôlé complet (liste blanche des `motsCles` de l'analyse IA). */
export const VOCABULAIRE_MOTS_CLES: string[] = [
  ...new Set(CATALOGUE.flatMap((o) => o.motsCles))
]

/**
 * Regroupe les œuvres d'un type par artiste, dans l'ordre du catalogue.
 * Alimente les carrousels de l'étape « Ma sélection » (repli sans matching).
 */
export function grouperParArtiste(tag: Tag): { artiste: string; oeuvres: Oeuvre[] }[] {
  const groupes: { artiste: string; oeuvres: Oeuvre[] }[] = []
  for (const o of CATALOGUE) {
    if (o.tag !== tag) continue
    let groupe = groupes.find((g) => g.artiste === o.artiste)
    if (!groupe) {
      groupe = { artiste: o.artiste, oeuvres: [] }
      groupes.push(groupe)
    }
    groupe.oeuvres.push(o)
  }
  return groupes
}

/** Accès direct à une œuvre par id — utilisé par les sections de la landing. */
export function parId(id: string): Oeuvre {
  const o = CATALOGUE.find((x) => x.id === id)
  if (!o) throw new Error(`Œuvre inconnue : ${id}`)
  return o
}
