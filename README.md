# Galeries Bartoux — Landing page + Widget conseiller IA

Démonstration interne reproduisant l'identité visuelle du site
[galeries-bartoux.com](https://www.galeries-bartoux.com), enrichie d'un **widget
conversationnel** qui guide un visiteur — même sans demande précise — jusqu'à un
lead qualifié, avec un rendu de l'œuvre dans son intérieur.

Le widget embarque un **pipeline hybride code + IA** (Google Gemini) : sans clé
API il fonctionne en mode démo (matching code pur, aperçu à l'échelle sans IA).

## Stack

- React 18 + TypeScript (mode strict, aucun `any`)
- Vite 5 + fonctions serverless Vercel (`api/`)
- Tailwind CSS 3 (+ quelques variables CSS d'identité)
- React Router v6 (une page, structure prête pour d'autres routes)
- État du widget : `useReducer` (machine d'état) + `useState`
- IA : Google Gemini via `@google/genai` — analyse (`gemini-3-flash`) et rendu
  (`gemini-3-pro-image-preview`, « Nano Banana Pro »)

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

| Script              | Rôle                                      |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Serveur de développement Vite             |
| `npm run build`     | Build de production dans `dist/`          |
| `npm run preview`   | Prévisualise le build de production       |
| `npm run typecheck` | Vérifie les types (`tsc --noEmit`, `src` + `api`) |

## Déploiement Vercel

1. Importer le dépôt sur Vercel — le preset **Vite** est détecté automatiquement
   (build : `npm run build`, output : `dist`) ; les fonctions `api/*.ts` sont
   déployées d'office.
2. Déclarer `GOOGLE_API_KEY` dans _Settings → Environment Variables_
   (facultatif : `ANALYZE_MODEL`, `RENDER_MODEL` pour changer de modèles).
3. `vercel.json` : rewrite SPA qui épargne `/api/*`, `maxDuration` 60 s.
4. Chaque `git push` déclenche un déploiement automatique.

## Le widget — pipeline hybride code + IA

Flux conversationnel (machine d'état `Step`) :

`welcome → type → photo → matching → results → render → lead → done`

À chaque étape, le code fait tout ce qui peut l'être gratuitement ; l'IA
n'intervient que là où elle est indispensable :

1. **Type + recherche libre** (`StepType`) : la détection d'artiste est en pur
   TS (`src/lib/artistMatch.ts`, sans accents, tolère les fautes). « Catalano »
   ne coûte aucun appel réseau.
2. **Photo + emplacement** (`StepPhoto`) : la photo est réduite ≤ 1280 px et
   ré-encodée JPEG côté client (`src/lib/image.ts`) — payload léger, dimensions
   connues pour l'échelle.
3. **Analyse** (`StepMatching` → `POST /api/analyze`) : UN appel Gemini Flash à
   sortie JSON structurée renvoie zones de placement (% de l'image), échelle
   `pxPerCm` (une dimension donnée par le client prime, sinon repères standards),
   ambiance, et l'intention normalisée dans le vocabulaire du catalogue
   (« un homme avec une valise qui marche » → Bruno Catalano). Appel évité si
   artiste nommé sans photo.
4. **Matching** (`src/lib/matching.ts`) : scoring 100 % code — filtres durs
   (type, artistes, œuvre trop grande pour la zone mesurée), scores doux
   (proportions, format souhaité, thèmes, couleurs) avec badges « pourquoi ».
5. **Rendu** (`StepRender` → `POST /api/render`) : le **code** pré-compose
   l'œuvre aux proportions réelles (`src/lib/placement.ts` + canvas) ; Nano
   Banana Pro ne fait qu'harmoniser (ombres, perspective, lumière, détourage
   sculpture) sans déplacer ni redessiner l'œuvre. L'overlay reste affiché en
   attendant et en secours.

Coût typique : ~0,14 $ par session complète (1 analyse + 1 rendu) ; 0 $ si
l'utilisateur nomme un artiste sans photo ou s'arrête avant le rendu. Garde-fous :
caches par hash (1 analyse par photo+textes, 1 rendu par œuvre×photo), plafonds
de longueur des textes, throttle par IP, body ≤ 3,5 Mo.

## Administration des prompts — `/admin`

Page interne (mot de passe `ADMIN_PASSWORD`) pour **éditer les prompts IA sans
redéployer** : instructions d'analyse (compréhension de la demande client),
consignes d'intégration du rendu (perspective, lumière, détourage) et bascule
du moteur de rendu **Gemini ↔ FLUX.1 Kontext max** (fal.ai, ~0,08 $/image,
spécialiste de la correction de perspective). Stockage : Vercel Edge Config
(lecture sub-ms à chaque appel, écriture via l'API REST Vercel).

Variables d'env associées (serveur uniquement) : `EDGE_CONFIG` (auto-injectée
en connectant le store), `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN`, `VERCEL_TEAM_ID`,
`ADMIN_PASSWORD`, `FAL_KEY` (moteur FLUX), `RENDER_PROVIDER` (défaut moteur,
optionnel). Garde-fous : le schéma JSON d'analyse et les règles anti-déformation
de l'œuvre restent verrouillés dans le code ; store vide/injoignable → prompts
par défaut ; `FAL_KEY` absente → repli Gemini.

Points techniques notables :

- **Dégradation gracieuse** : clé absente, réseau coupé ou erreur modèle → le
  widget garde le comportement démo (matching code, overlay à l'échelle).
- **Anti-course** : une réponse de rendu arrivée après un changement d'œuvre ou
  de photo est ignorée par le réducteur.
- **Accessibilité** : `role="dialog"`, `aria-label`, focus à l'ouverture,
  fermeture au clavier (Échap), respect de `prefers-reduced-motion`.

## Structure

```
api/
├── analyze.ts             # analyse scène + intention (Gemini Flash, JSON structuré)
├── render.ts              # harmonisation du composite (Nano Banana Pro)
└── _lib/                  # client Gemini + garde-fous (privé, non exposé)
src/
├── components/
│   ├── Nav, HeroSlider, CoupsDeCoeur, Expositions, Nouveau,
│   │   Actualites, Histoire, BandeauWhatsApp, Footer, icons
│   └── widget/
│       ├── Widget, WidgetLauncher, WidgetPanel, state, ui
│       └── steps/  (StepWelcome … StepDone)
├── data/catalogue.ts      # catalogue enrichi (dims cm, mots-clés, couleurs)
├── lib/                   # artistMatch, matching, placement, image, aiClient
├── types/                 # index.ts (domaine), ai.ts (contrats du pipeline)
├── App.tsx, main.tsx, index.css
```

> Les œuvres du catalogue sont mockées en local (vrais artistes Bartoux, photos
> servies depuis `public/artistes/`). Le formulaire de contact final est simulé
> (aucun envoi réel).
