# André Laurent — Boutique de démonstration + widget conseiller de style

Démonstration interne d'un **widget conversationnel de prêt-à-porter masculin** :
il qualifie la demande d'un visiteur, lui compose une tenue cohérente, puis la
lui fait **essayer sur sa propre photo**.

La boutique qui l'accueille (`ANDRÉ LAURENT`) est une **marque fictive**. Sa
mise en page — page catégorie, typographie serif, palette noir/blanc/gris,
angles droits — reproduit celle d'un site de prêt-à-porter haut de gamme type
[johnhenric.com](https://johnhenric.com), pour que le widget soit testé dans un
contexte réaliste.

Le widget embarque un **pipeline hybride code + IA** (Google Gemini) : sans clé
API, il fonctionne en mode démo de bout en bout (intention, questions,
reformulation, classement en pur code ; planche produit au lieu de l'essayage).

## Stack

- React 18 + TypeScript (mode strict, aucun `any`)
- Vite 5 + fonctions serverless Vercel (`api/`)
- Tailwind CSS 3 (+ variables CSS d'identité)
- React Router v6 (boutique + `/admin`)
- État du widget : `useReducer` (machine d'état) + `useState`
- IA : Google Gemini via `@google/genai` — lecture de la demande et
  reformulation (`gemini-3.1-pro-preview`), essayage
  (`gemini-3-pro-image`, « Nano Banana Pro »)

## Démarrer en local

```bash
npm install
npm run dev        # http://localhost:5173 — sans IA (pas de fonctions api/)
```

Pour tester le pipeline IA complet (front + fonctions serverless) :

```bash
cp .env.example .env.local   # puis renseigner GOOGLE_API_KEY
npx vercel link              # une fois
npx vercel dev               # http://localhost:3000
```

## Scripts

| Script              | Rôle                                              |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Serveur de développement Vite                     |
| `npm run build`     | Build de production dans `dist/`                  |
| `npm run preview`   | Prévisualise le build de production               |
| `npm run typecheck` | Vérifie les types (`tsc --noEmit`, `src` + `api`) |
| `npm run visuels`   | Régénère les visuels produits de `public/produits/` |

## Le widget — parcours

Machine d'état `Step`, onze étapes :

```
welcome → request → qualify → matching → brief → selection → photo → outfit → render → lead → done
                                  ↑ transitoire            ↑ deux temps internes
```

1. **`request` — la demande.** Champ libre (« un costume en lin pour un mariage
   en juin ») + six amorces cliquables. Chaque amorce est rédigée pour être lue
   par le détecteur d'intention : un clic répond déjà à deux ou trois questions.

2. **`qualify` — la qualification.** Deux à quatre questions en puces
   (occasion, matière, palette, budget, coupe), avec le fil des échanges
   au-dessus et chaque réponse modifiable d'un clic. **Une question dont la
   réponse figure déjà dans la demande libre n'est pas posée** — c'est le rôle
   de la pré-passe 100 % code `src/lib/intent.ts` (sans accents, tolérante aux
   fautes). « Un costume en lin pour un mariage » ne déclenche que 3 questions
   au lieu de 5.

3. **`matching` — le pipeline.** Intention code → analyse IA *seulement si elle
   apporte quelque chose* (`besoinAnalyseIA`) → classement du catalogue
   (`src/lib/matching.ts`, 0 appel réseau) → reformulation IA.

4. **`brief` — la validation.** Le widget reformule le besoin en une phrase et
   ajoute un conseil ; chaque critère retenu est une puce **retirable d'un
   geste**, plus rapide que de refaire tout le questionnaire. Repli 100 % code
   (`src/lib/brief.ts`) si l'IA est indisponible.

5. **`selection` — les pièces, en deux temps.** *Temps A* : uniquement les
   familles demandées, en carrousels, avec des badges « pourquoi » issus du
   scoring (« Lin, comme souhaité », « Pour un mariage (invité) »). *Temps B* :
   « Complétez la tenue » propose les familles complémentaires, réordonnées par
   les accords des pièces déjà retenues.

6. **`photo` — l'essayage.** Photo de soi (réduite ≤ 1280 px et ré-encodée en
   JPEG côté client), ou silhouette d'exemple, ou aucune photo.

7. **`outfit` — le récapitulatif.** La tenue pièce par pièce, le total, les
   avertissements doux, et ce que le rendu va remplacer sur la photo. Le bouton
   « Voir le résultat » est actif dès **une** pièce retenue, et une
   **confirmation explicite** précède la génération.

8. **`render` — le résultat.** Essayage généré, ou planche « flat lay » de la
   tenue (sans photo, ou en secours). Téléchargement et partage natif mobile.

### Garde-fous de composition — `src/lib/tenue.ts`

Chaque article revendique un ou plusieurs **emplacements** (`Slot`) :

| Famille               | Emplacements occupés               |
| --------------------- | ---------------------------------- |
| `costume`             | `torse-exterieur` **+** `jambes`   |
| `veste`               | `torse-exterieur`                  |
| `pantalon`            | `jambes`                           |
| `chemise`, `maille`   | `torse-interieur`                  |
| `chaussures`          | `pieds`                            |
| accessoires           | `cou`, `taille`, `poche`, `poignet` |

Deux articles qui se disputent un emplacement ne peuvent pas être portés
ensemble. **Un conflit ne bloque jamais : il remplace, et l'interface
l'explique.** Retenir un costume alors qu'une veste et un pantalon sont déjà
là retire les deux, avec la notice « … ont été retirés : « Costume deux-pièces
en lin » comprend déjà sa veste et son pantalon. » Idem pour deux pantalons,
deux paires de chaussures, cravate + nœud papillon.

Les **dépendances** (pochette sans veste, cravate sans chemise, ceinture sans
pantalon) donnent un avertissement au récapitulatif, jamais un blocage.

### Le rendu — remplacement de vêtements

`POST /api/render` envoie au modèle la photo du visiteur **puis** un visuel par
pièce. Le prompt est formulé comme une **édition** : le squelette verrouillé
dans `api/render.ts` associe chaque pièce à la partie du corps qu'elle remplace,
énumère explicitement ce qui ne doit **pas** être touché (les emplacements sans
pièce fournie), et interdit toute modification du visage, de la carnation, de la
morphologie, de la pose et du décor. Les consignes de réalisme textile (tombé,
matière, plis, lumière, ombres, ordre de superposition) restent éditables depuis
`/admin`.

Garde-fous de coût : caches par hash (1 analyse par demande, 1 essayage par
photo × composition), déduplication des requêtes en vol, plafonds de longueur,
throttle par IP, body ≤ 3,5 Mo. Coût typique : 2 appels texte courts + 1 image
par session complète, 0 appel si le visiteur s'arrête avant le rendu.

## Visuels produits

`public/produits/*.svg` sont des **placeholders générés** (`npm run visuels`),
pas des photos. Le rendu IA restera de faible qualité tant que de vraies photos
produit ne seront pas déposées : voir `public/produits/README.md` pour la
procédure de remplacement (même slug, extension `.jpg`).

## Administration des prompts — `/admin`

Page interne (mot de passe `ADMIN_PASSWORD`) pour **éditer les prompts IA sans
redéployer** : lecture de la demande, reformulation, et consignes de réalisme de
l'essayage. Stockage : Vercel Edge Config (lecture sub-ms à chaque appel,
écriture via l'API REST Vercel).

Variables associées (serveur uniquement) : `EDGE_CONFIG` (auto-injectée en
connectant le store), `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN`, `VERCEL_TEAM_ID`,
`ADMIN_PASSWORD`. Garde-fous : les schémas JSON de sortie, le filtrage sur le
vocabulaire du catalogue et les règles de préservation de la personne restent
verrouillés dans le code ; store vide ou injoignable → prompts par défaut.

## Déploiement Vercel

1. Importer le dépôt sur Vercel — le preset **Vite** est détecté automatiquement
   (build : `npm run build`, output : `dist`) ; les fonctions `api/*.ts` sont
   déployées d'office.
2. Déclarer `GOOGLE_API_KEY` dans _Settings → Environment Variables_.
3. `vercel.json` : rewrite SPA qui épargne `/api/*`, `maxDuration` 60 s.

## Points techniques notables

- **Dégradation gracieuse** : clé absente, réseau coupé ou erreur modèle → le
  widget garde un parcours complet (intention code, brief code, classement code,
  planche produit).
- **Budget sans impasse** : si le plafond annoncé exclut toute une famille, les
  pièces sont quand même montrées avec le badge « Au-dessus de votre budget »
  plutôt qu'un écran vide.
- **Anti-course** : une réponse de rendu arrivée après un changement de tenue ou
  de photo est ignorée par le réducteur (clé de composition).
- **Accessibilité** : `role="dialog"`, `aria-label`, `aria-pressed` sur les
  puces et les tuiles, focus à l'ouverture, fermeture au clavier (Échap),
  respect de `prefers-reduced-motion`.

## Structure

```
api/
├── analyze.ts             # lecture de la demande → intention (JSON structuré)
├── brief.ts               # reformulation + conseil (JSON structuré)
├── render.ts              # essayage virtuel (Nano Banana Pro, N images)
└── _lib/                  # client Gemini, store de prompts, garde-fous
src/
├── components/
│   ├── Nav, CategoryHero, ProductGrid, Services, Footer, Logo, icons
│   └── widget/
│       ├── Widget, WidgetLauncher, WidgetPanel, state, ui
│       └── steps/  (StepWelcome … StepDone)
├── data/
│   ├── catalogue.ts       # 37 articles mockés (matières, occasions, accords)
│   └── questions.ts       # banque de questions de qualification
├── lib/                   # intent, matching, tenue, brief, planche, image, aiClient
├── types/                 # index.ts (domaine), ai.ts (contrats), admin.ts
├── App.tsx, main.tsx, index.css
scripts/generer-visuels.mjs # génère public/produits/*.svg
```

> Le catalogue est mocké en local et le formulaire de contact final est simulé
> (aucun envoi réel).
