# Base vectorielle catalogue — structure, contenu, ingestion

**Suite de `note-cadrage-widget.md`** : cette note traite l'**axe 1** (« Récupération d'infos »)
et la **question ouverte n°4** (« taille de catalogue au-delà de laquelle les whitelists en prompt
ne tiennent plus »). Elle répond à une question précise : *quelle structure de base vectorielle,
et qu'est-ce qu'on met dedans ?*

Aucun développement à ce stade.

---

## 1. Le problème, correctement posé

Le widget appelle déjà le LLM **une seule fois par demande** (`/api/analyze`), jamais par objet.
Ce n'est donc pas le nombre d'appels IA qu'il faut réduire — il est déjà minimal.

Le problème est le **rappel à l'échelle**. `classerArticles` (`src/lib/matching.ts:33`) boucle sur
`CATALOGUE`, un tableau TypeScript de 37 objets chargé en mémoire côté client. À 3 000–50 000 SKU,
ce modèle casse sur trois points distincts :

| Ce qui casse | Où | Pourquoi |
|---|---|---|
| Le catalogue ne tient plus dans le bundle | `src/data/catalogue.ts` | 50 000 fiches ≠ un fichier TS livré au navigateur |
| Les whitelists explosent le prompt | `api/analyze.ts:79-83`, dérivées en `catalogue.ts:932-944` | `VOCABULAIRE_*` est une **projection du catalogue**, il grandit avec lui |
| Le scoring rate tout ce qui n'est pas littéral | `matching.ts:68-75` | Comparaison de sous-chaînes : « cet été », « chic sans être guindé » ne matchent rien |

**L'invariant ne bouge pas** : *la recommandation ne sort jamais du LLM — elle sort du catalogue
via un scoring en code.* Le vecteur fait du **rappel** (ramener un sous-ensemble candidat), jamais
du **classement**. L'étape de scoring reste `classerArticles()`, avec ses scores additifs et ses
badges `raisons[]`.

---

## 2. Le flow cible

```
① Ouverture du widget
② Choix du type                      [galerie : sculpture/peinture — PAP : pas d'équivalent, cf. §9]
③ Saisie — texte libre optionnel
④ Détection par mots-clés — CODE PUR (detecterIntention)
   ├─ signal fiable ────────────────────────────────────────────► ⑥
   └─ aucun mot-clé fiable ──► GARDE-FOU « appel LLM nécessaire ? » (besoinAnalyseIA)
                                 ├─ saisie vide ────────────────► ⑥ (défauts)
                                 └─ oui ──► ⑤ LLM 1 — compréhension du besoin
                                              ├─ critères structurés ─────► ⑥
                                              └─ demande floue / sensorielle ──► ⑦
⑥ Recherche directe — FILTRE EXACT (SQL)
   ├─ ≥ 1 résultat ─────────────────────────────────────────────► ⑪
   └─ 0 résultat ───────────────────────────────────────────────► ⑦
⑦ Recherche sémantique — BASE VECTORIELLE
   ├─ correspondance directe ───────────────────────────────────► ⑪
   ├─ correspondance proche, pas exacte ──► ⑩ LLM 2 — proposition alternative ──► ⑪
   └─ aucun résultat même approché ──────► « aucune correspondance disponible » ──► ⑫
⑪ Scoring et classement — CODE, 0 $
⑫ Présentation au client
```

**Ce que ce flow décide, et qui structure tout le reste** : le vectoriel est un **recours**, pas un
canal permanent. Il ne se déclenche que sur deux portes — demande floue/sensorielle (⑤→⑦) ou filtre
exact bredouille (⑥→⑦). Trois conséquences directes :

1. **Pas de fusion hybride permanente.** L'architecture est plus simple et moins chère qu'un
   hybride systématique. Un parcours nominal (« un costume bleu marine pour le bureau ») ne paie
   **aucun embedding**.
2. **Il faut deux seuils de distance, pas un.** L'étape ⑨ a **trois** sorties. Sans seuils
   calibrés, elle n'en aurait que deux — voir §7, c'est le paramètre le plus délicat du
   dispositif.
3. **Point faible connu.** Une demande *mixte* — « un costume **en lin**, léger, pour un mariage
   **en plein soleil** » — produit un signal fiable en ④, part en ⑥, trouve des résultats, et **ne
   touche jamais le vecteur** : la moitié sensorielle est perdue. Voir §9.

---

## 3. Le moteur : Postgres + pgvector

Le repo n'a **aucune base de données** : `package.json` ne contient que `@google/genai`,
`@vercel/edge-config` et React. Il en faut une de toute façon — catalogue, stock, leads
(`StepLead.tsx:24` n'envoie rien aujourd'hui), tenants. Ajouter Pinecone/Qdrant, c'est ajouter un
**second** système et un problème de double écriture.

| Critère | Postgres + pgvector | Base vectorielle dédiée |
|---|---|---|
| Base manquante | **La résout** | Ne résout rien — il faut *quand même* un Postgres |
| Étapes ⑥ et ⑦ | **Le même moteur** : une connexion, un schéma, un `EXPLAIN` | ⑥ en SQL, ⑦ ailleurs → deux systèmes à synchroniser pour un flow qui bascule de l'un à l'autre |
| Bascule ⑥→⑦ | Deux requêtes, même base, connexion partagée | Un aller-retour réseau de plus, sur le chemin le plus lent du parcours |
| Cohérence | Produit + vecteur dans un `BEGIN` — la sync incrémentale (§4) est transactionnelle | Deux systèmes, vecteurs orphelins possibles |
| Coût à 50 k SKU | `halfvec(768)` ≈ 76 Mo + HNSW ≈ 85 Mo → palier gratuit | ~25 $/mois **en plus** du Postgres |

Le flow en cascade renforce l'argument : ⑥ est du SQL relationnel pur, ⑦ est du vectoriel, et les
deux lisent le même catalogue. Les séparer physiquement serait un coût net.

Une base dédiée gagnerait au-delà de ~10 M vecteurs par tenant — deux ordres de grandeur au-dessus
du besoin. **Porte de sortie** : toute la récupération est isolée derrière `api/_lib/retrieval.ts`.
Changer de moteur = réécrire ce fichier, rien d'autre.

Accès : `@neondatabase/serverless` (HTTP, pas de pool TCP à épuiser depuis les fonctions Vercel).

---

## 4. Ce qu'on met dans le vecteur

La bonne réponse n'est pas « tout ». C'est **trois destinations selon la nature du champ** :

| Nature du champ | Destination | Sert à | Exemples |
|---|---|---|---|
| Contrainte **binaire**, non négociable | Colonne SQL + index | ⑥ filtre exact | `tenant_id`, `categorie`, `prix`, `disponible`, `tailles` |
| Vocabulaire **contrôlé**, exact | `facettes text[]` + GIN | ⑥ filtre exact | `occ:mariage-invite`, `mat:lin`, `col:beige` |
| Langage **nuancé**, ouvert | **Vecteur** | ⑦ recours sémantique | ambiance, saisonnalité, registre, matière ressentie |

Un prix ne s'embarque pas : c'est un filtre. Une occasion codée `mariage-invite` non plus : c'est
une facette exacte, traitée en ⑥. **Le vecteur ne porte que ce que ni le filtre ni le mot exact ne
savent attraper** — exactement le périmètre de l'étape ⑦.

### 4.1 Le texte embarqué : une phrase canonique générée par le code

Surtout **pas** la fiche fournisseur brute (`REF-3345 / 100% LIN / DOUBLURE VISCOSE / LAVAGE 30°`) :
elle dilue le signal. On compose une phrase française qui **ressemble à une demande de client**,
puisque c'est à une demande de client — floue, sensorielle — qu'elle sera comparée en ⑦ :

```
{nom}. {libellé catégorie}. Convient pour {occasions en clair}.
Matière {matiere} — {saison et chaleur en clair}. Couleur {couleur}. Coupe {coupe}. Motif {motif}.
{description_courte}
Registre : {formalité en clair}. Style : {mots_cles}.
Se porte avec {familles des accords}.
```

Rendu pour `c4` (costume lin beige) :

> « Costume deux-pièces en lin. Costume. Convient pour un mariage (invité), une cérémonie, le
> quotidien. Matière lin — léger, respirant, pour l'été et les fortes chaleurs. Couleur beige
> sable. Coupe regular. Motif uni. Lin lavé beige sable, veste déstructurée : le costume d'un
> mariage en extérieur, en plein soleil. Registre : habillé sans être formel. Style : été, mariage,
> extérieur, décontracté-chic. Se porte avec une chemise, des chaussures, un accessoire. »

**Règles d'or**

- Vocabulaire écrit en **langage naturel** (`libelle`), jamais en slug : un embedding travaille sur
  la langue, pas sur `mariage-invite`.
- **Dériver la saison et la chaleur depuis la matière**, en toutes lettres. C'est ce qui permet à ⑦
  de répondre à « quelque chose de léger pour l'été » — aucun champ ne l'encode aujourd'hui.
- **Exclure** : `prix` (nombre, mal embarqué, déjà filtre dur), `id`, `sku`, `tailles`, et surtout
  `descriptionRendu` (fragment de prompt image — autre métier, bruit pur ici).
- Cible **80–150 tokens**. Au-delà, le vecteur se moyenne, perd son pouvoir discriminant, et les
  seuils de ⑨ deviennent inexploitables.
- Le texte composé est **stocké** (`article_vecteur.texte_source`) : quand ⑦ surprend, on lit ce
  qui a réellement été indexé.

---

## 5. Le schéma

### 5.1 Fondations

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Recherche FR insensible aux accents — miroir SQL de normaliser() (src/lib/intent.ts:11)
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);
ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;

CREATE TABLE tenant (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nom  text NOT NULL,
  modele_embedding text NOT NULL DEFAULT 'gemini-embedding-001',  -- VERROUILLÉ, cf. §8
  dims_embedding   int  NOT NULL DEFAULT 768,
  seuil_direct     real NOT NULL DEFAULT 0.35,   -- ⑨ « correspondance directe »
  seuil_proche     real NOT NULL DEFAULT 0.55,   -- au-delà → « aucun résultat »
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  cree_le timestamptz NOT NULL DEFAULT now()
);

-- Les VOCABULAIRE_* deviennent une donnée curée par tenant, au lieu d'une projection
-- du catalogue. Les synonymes remplacent MOTS_CATEGORIE / MOTS_OCCASION /
-- SYNONYMES_COULEUR codés en dur (intent.ts:41-130) : l'étape ④ devient configurable.
CREATE TABLE vocabulaire (
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  type      text NOT NULL CHECK (type IN
              ('categorie','occasion','matiere','couleur','mot_cle','coupe','slot','saison','motif')),
  terme     text NOT NULL,   -- canonique : 'mariage-invite'
  libelle   text NOT NULL,   -- naturel : 'un mariage (invité)' — prompt ET texte embarqué
  synonymes text[] NOT NULL DEFAULT '{}',
  ordre     int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, type, terme)
);
```

C'est cette table qui tranche la question ouverte n°4 : le vocabulaire cesse de grandir avec le
catalogue, il devient borné et injectable quel que soit le nombre de produits.

### 5.2 `article` — reprend `Article` (`src/types/index.ts:45`) et le complète

```sql
CREATE TABLE article (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  ref_externe text NOT NULL,               -- id du scraping / Shopify / CSV ; 'c1' en démo

  -- Identité / présentation (miroir exact de Article)
  nom text NOT NULL, categorie text NOT NULL, slots text[],
  matiere text, couleur text, coupe text,
  image text, gradient text, description_courte text,
  description_rendu text,                  -- prompt image, JAMAIS embarqué (§4)
  url_produit text,

  -- Vocabulaire contrôlé — alimente le FILTRE EXACT ⑥
  matieres text[], couleurs text[], occasions text[], mots_cles text[],

  -- Qualification AJOUTÉE
  saisons   text[],                                      -- printemps|ete|automne|hiver
  formalite smallint CHECK (formalite BETWEEN 1 AND 5),  -- 1 décontracté → 5 cérémonie
  chaleur   smallint CHECK (chaleur   BETWEEN 1 AND 5),  -- 1 léger → 5 chaud
  motif     text,                                        -- uni|raye|carreaux|prince-de-galles
  attributs jsonb NOT NULL DEFAULT '{}',                 -- extensions tenant SANS migration

  -- Commerce (absent aujourd'hui — cf. note de cadrage §6, « synchro stock »)
  prix numeric(10,2) NOT NULL, prix_barre numeric(10,2), devise char(3) DEFAULT 'EUR',
  actif boolean DEFAULT true,
  disponible boolean DEFAULT true,         -- ≥ 1 variante en stock (trigger)
  stock_total int DEFAULT 0,

  -- Synchronisation incrémentale (§6)
  source text DEFAULT 'scraping',
  contenu_hash text DEFAULT '',            -- hash des champs BRUTS → skip du LLM si inchangé
  scraping_id uuid, dernier_vu_le timestamptz,
  enrichi_par text, enrichi_le timestamptz, confiance real,
  statut text DEFAULT 'publie' CHECK (statut IN ('brouillon','a_valider','publie')),

  -- Canaux du filtre exact ⑥
  facettes text[],   -- 'cat:costume','occ:mariage-invite','mat:lin','col:beige'
  tsv tsvector,      -- nom || matiere || couleur || description_courte || mots_cles

  maj_le timestamptz DEFAULT now(),
  UNIQUE (tenant_id, ref_externe)
);

CREATE INDEX ON article (tenant_id, categorie, prix) WHERE actif AND disponible;
CREATE INDEX ON article USING gin (facettes);   -- ⑥ : un seul index pour cat:/occ:/mat:/col:
CREATE INDEX ON article USING gin (tsv);
CREATE INDEX ON article USING gin (saisons);
CREATE INDEX ON article USING gin (attributs jsonb_path_ops);
CREATE INDEX ON article USING gin (nom gin_trgm_ops);
```

> **Piège à l'écriture** : `facettes` et `tsv` sont naturellement des colonnes générées, mais
> Postgres refuse les sous-requêtes (`array_agg` sur `unnest`) dans un `GENERATED ALWAYS AS` et
> exige une configuration de recherche `IMMUTABLE`. Les deux seront renseignées par le trigger
> d'ingestion, ou via une fonction `IMMUTABLE` dédiée. Ne pas supposer que la version naïve passe.

Deux tables complètent le modèle : `article_variante` (stock par taille — « le 48 est en rupture »
ne doit pas être recommandé à un 48) et `article_accord` (les `accords[]` deviennent une relation
avec provenance `manuel|llm|cooccurrence|visuel` et poids).

### 5.3 `article_vecteur` — table séparée

```sql
CREATE TABLE article_vecteur (
  article_id   uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  modele       text NOT NULL,                 -- dans la PK : deux modèles cohabitent
  type         text NOT NULL DEFAULT 'texte' CHECK (type IN ('texte','image')),
  dims         int  NOT NULL,
  vecteur      halfvec(768) NOT NULL,
  texte_source text NOT NULL DEFAULT '',      -- le texte réellement embarqué — auditable
  source_hash  text NOT NULL,                 -- ré-embarquer seulement si le texte a changé

  -- Colonnes de filtre DÉNORMALISÉES. Load-bearing : le WHERE et le ORDER BY doivent
  -- porter sur la MÊME table, sinon l'index HNSW ne sert à rien.
  tenant_id uuid NOT NULL, categorie text NOT NULL, prix numeric(10,2) NOT NULL,
  disponible boolean DEFAULT true, actif boolean DEFAULT true,

  PRIMARY KEY (article_id, modele, type)
);

CREATE INDEX article_vecteur_hnsw ON article_vecteur
  USING hnsw (vecteur halfvec_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX article_vecteur_filtre ON article_vecteur
  (tenant_id, modele, type, categorie, disponible, prix);

-- Le prix et le stock bougent tous les jours : la dénormalisation ne doit pas dériver.
CREATE TRIGGER article_maj_filtres AFTER UPDATE OF categorie, prix, disponible, actif, statut
  ON article FOR EACH ROW EXECUTE FUNCTION sync_vecteur_filtres();
```

**Trois raisons de sortir le vecteur de `article`** : ① migration de modèle sans coupure (indexer
sous un nouveau `modele` pendant que l'ancien sert le trafic, puis basculer le tenant) ; ② `type`
dans la PK ouvre l'embedding image (§10) sans migration ; ③ la sync incrémentale manipule les
vecteurs seuls, sur une table étroite, sans toucher `article`.

### 5.4 Embedding — les détails qui font mal

| Choix | Valeur | Raison |
|---|---|---|
| Fournisseur | **Gemini**, `@google/genai` déjà en dépendance | Aucun second fournisseur IA à introduire |
| Dimension | **768** via `outputDimensionality` | 4× moins de stockage que 3072, perte quasi nulle (MRL) |
| Type SQL | **`halfvec(768)`** | HNSW plafonne à 2 000 dims sur `vector`, 4 000 sur `halfvec`. **3072 serait non indexable** |
| Distance | cosinus (`<=>`, `halfvec_cosine_ops`) | Métrique des seuils de ⑨ |
| `task_type` | `RETRIEVAL_DOCUMENT` à l'ingestion, `RETRIEVAL_QUERY` en ⑦ | Asymétrie souvent oubliée, elle pèse lourd sur la qualité |
| **Piège** | **Re-normaliser en L2** après troncature MRL | Seule la sortie 3072 est pré-normalisée. Tronquer à 768 sans renormaliser fausse **silencieusement** toutes les distances — donc les seuils de ⑨ |

**Coûts** : premier run 50 000 produits × ~120 tokens ≈ 6 M tokens → ~1 $. Runs suivants : seuls les
produits « changés » (§6). Une requête ⑦ ≈ 30 tokens → ~0,000006 $, **et seuls les parcours qui
atteignent ⑦ la paient**. Les 6 amorces de `StepRequest.tsx` ont leur vecteur précalculé → 0 $.

---

## 6. Ingestion : synchronisation incrémentale par hash

```
catalogue.json  (scraping / export client)
  │ pour chaque produit : contenu_hash = hash(champs BRUTS fournisseur)
  ├─ NOUVEAU   (ref absente en base)      ──► enrichissement LLM + embedding + INSERT vecteur
  ├─ CHANGÉ    (hash différent)           ──► ré-enrichissement + ré-embedding + UPDATE vecteur
  ├─ INCHANGÉ  (hash identique)           ──► AUCUNE ACTION — 0 appel LLM, 0 $
  └─ ORPHELIN  (en base, absent du .json) ──► DELETE vecteur + article.actif = false
```

C'est ce bloc qui rend le coût d'exploitation tenable : sur 50 000 SKU re-scrapés quotidiennement,
seules les quelques centaines de fiches réellement modifiées paient un appel LLM.

**Détection des orphelins** : chaque run porte un `scraping_id` ; tout produit vu est marqué
`dernier_vu_le = now()`. Les orphelins sont ceux dont `dernier_vu_le < début du run`.

> **Garde-fou obligatoire.** Un scraping qui échoue à moitié (site en maintenance, sélecteur cassé,
> rate-limit) renvoie un `catalogue.json` tronqué — et la règle orpheline **supprimerait alors la
> moitié du catalogue**. Le run doit **avorter sans rien supprimer** si le nombre de produits vus
> tombe sous un seuil du run précédent (ex. 90 %), et journaliser l'écart pour validation humaine.
> C'est la panne la plus coûteuse de tout le dispositif.

> **Suppression douce.** On supprime le **vecteur** — l'article sort du rappel immédiatement, ⑥ et ⑦
> ne le voient plus — mais on garde la ligne `article` en `actif = false` : un lead ou une tenue
> composée peuvent y faire référence, et une reprise de stock la réactive sans ré-enrichissement si
> le hash n'a pas bougé.

### 6.1 L'enrichissement produit

**Contrat** — entrée : `{tenant, brut: {titre, description_html, type_produit, tags[], vendor,
options[], prix, images[]}, vocabulaires}` ; sortie (JSON contraint, miroir de `analyseSchema` mais
côté produit) : `{categorie, slots[], matiere, matieres[], couleur, couleurs[], coupe, occasions[],
motsCles[], saisons[], motif, formalite, chaleur, descriptionCourte, descriptionRendu, attributs,
confiance}`.

**Règles non négociables** — ce sont elles qui préservent l'invariant :

- Le LLM **ne fixe jamais** `prix`, `stock`, `tailles`, `ref_externe`, `image` : ces champs viennent
  du flux, tels quels.
- Toute valeur est re-filtrée contre la whitelist du tenant, exactement comme `filtrerWhitelists`
  (`api/analyze.ts:153`) le fait aujourd'hui pour la demande. **Un terme halluciné reste impossible.**
- `confiance < 0,6` → `statut = 'a_valider'` : le produit **n'est pas recommandable** tant qu'un
  humain n'a pas validé. C'est le crochet du « score de préparation données » (cadrage §6).
- Prompt à deux niveaux, comme les trois autres : squelette dans le code, section TÂCHES éditable
  via un champ `enrichInstructions` dans `PromptConfig` (`api/_lib/promptStore.ts`), exposé sur
  `/admin`.

**Exécution** : pas dans une fonction Vercel (plafond 60 s). Un script `scripts/ingerer.mjs` calqué
sur `scripts/generer-photos.mjs` (lecture `.env.local`, `--force`, `--only`, reprise), concurrence
5–10, backoff. Modèle Flash : ~800 tokens in / 250 out par produit → 50 000 produits pour quelques
dizaines de dollars **au premier run**, puis quasi rien.

---

## 7. Les deux requêtes du flow

### ⑥ Recherche directe — filtre exact, aucun vecteur

```sql
SELECT <projection allégée>
FROM article a
WHERE a.tenant_id = $1 AND a.actif AND a.disponible AND a.statut = 'publie'
  AND a.categorie = ANY($2)
  AND ($3::text[] IS NULL OR a.facettes @> $3)      -- toutes les facettes exigées
  AND ($4::numeric IS NULL OR a.prix <= $4 * 1.5)
ORDER BY (SELECT count(*) FROM unnest(a.facettes) f WHERE f = ANY($5)) DESC, a.prix
LIMIT 200;
```

`@>` pour les critères durs, comptage de recouvrement pour l'ordre de rappel. **0 ligne → bascule
en ⑦**, c'est la porte « Non - 0 résultat » du flow.

### ⑦ Recherche sémantique — le recours

```sql
SET LOCAL hnsw.ef_search = 100;
SET LOCAL hnsw.iterative_scan = 'relaxed_order';   -- pgvector ≥ 0.8, indispensable en recherche filtrée

SELECT v.article_id, v.vecteur <=> $3::halfvec AS distance
FROM article_vecteur v
WHERE v.tenant_id = $1 AND v.modele = $2 AND v.type = 'texte' AND v.actif AND v.disponible
  AND ($4::text[] IS NULL OR v.categorie = ANY($4))   -- catégorie relâchée si ⑥ a échoué
  AND ($5::numeric IS NULL OR v.prix <= $5 * 1.5)     -- garde-fou de rappel, PAS la règle métier
ORDER BY v.vecteur <=> $3::halfvec
LIMIT 200;
```

### ⑨ Les trois sorties — le paramètre le plus délicat

Une recherche vectorielle renvoie **toujours** un plus proche voisin, même absurde. Sans seuils, la
branche « aucun résultat même approché » ne se déclencherait **jamais**, et le widget proposerait un
costume à qui cherche une robe de mariée.

| Distance du meilleur résultat | Sortie ⑨ | Suite |
|---|---|---|
| `d ≤ seuil_direct` (0,35) | Correspondance **directe** | → ⑪ scoring |
| `seuil_direct < d ≤ seuil_proche` (0,55) | **Proche**, pas exacte | → ⑩ LLM 2 → ⑪ |
| `d > seuil_proche` | **Aucun résultat** | → message « aucune correspondance disponible » → ⑫ |

Ces valeurs sont des **points de départ à calibrer** sur le jeu doré (§8), pas des constantes
universelles : elles dépendent du modèle, de la longueur du texte embarqué et de la verticale. Elles
vivent dans `tenant` pour être réglées par client sans redéploiement, comme les prompts le sont déjà.

### ⑩ LLM 2 — proposition alternative

Troisième appel IA du parcours, **texte seulement**, même contrat que `/api/brief` : il explique
*pourquoi* on propose autre chose (« vous cherchiez du velours ; il n'y en a pas cette saison, voici
deux laines à la main comparable »). Il **ne choisit pas** les articles — ils viennent de ⑦ puis ⑪.

### Latence

Parcours nominal (④→⑥→⑪) : aucun embedding, une requête SQL indexée, **5–20 ms**.
Parcours de recours (⑦) : embedding 80–250 ms + HNSW 2–10 ms → **150–350 ms**.
`StepMatching.tsx:51-82` enchaîne déjà des `delai(800/700/500/600)` **artificiels** : les deux
tiennent dans l'animation existante, et « Recherche dans la collection… » devient une vraie phase.

---

## 8. Invariants et vérification

### 8.1 Dégradation gracieuse — le principe est étendu, pas contourné

| Panne | Comportement |
|---|---|
| `DATABASE_URL` absente | Repli sur `CATALOGUE` statique → **comportement d'aujourd'hui à l'identique**, comme l'absence de `GOOGLE_API_KEY` |
| Base injoignable (timeout 1 200 ms) | Idem. Jamais d'écran d'erreur |
| Embedding en échec | **⑦ désactivée**, le parcours s'arrête à ⑥. La cascade dégrade naturellement : on perd le recours, pas le service |
| Tenant réel 50 k SKU, base absente | Repli sur un jeu de secours de 200 articles curés, livré dans la config du tenant |

### 8.2 La recommandation ne sort toujours pas du LLM

⑦ choisit *qui est scoré*, jamais l'ordre final ; ⑩ rédige une explication, ne sélectionne rien. Le
filtre budget en ⑥/⑦ est `prix <= budget * 1,5`, un **garde-fou de rappel** : la règle métier
(`<= budgetMax`, et le repli honnête « Au-dessus de votre budget » plutôt qu'une liste vide,
`matching.ts:97-105`) reste dans le code. **Interdiction d'afficher une distance** (« proximité
0,87 ») : non explicable à un client — les `raisons[]` restent celles que le code sait justifier.

### 8.3 Le piège des embeddings — contredit un pattern déjà présent

`api/_lib/gemini.ts` implémente `avecMeilleurModele()`, une cascade qui bascule de modèle sur
404/403/429. **Ce pattern est faux pour les embeddings** : un vecteur produit par le modèle A est
incomparable à un index construit avec B. La cascade ne renverrait pas une réponse dégradée mais des
résultats **silencieusement absurdes**, et les seuils de ⑨ n'auraient plus aucun sens.

> Le modèle d'embedding est **épinglé** par `tenant.modele_embedding`. En cas d'indisponibilité, on
> **désactive ⑦** et on sert sur ⑥. On ne cascade **jamais**. Changer de modèle = ré-indexer sous un
> nouveau `modele`, puis basculer le tenant.

### 8.4 Jeu doré — comble aussi le trou « Éval : Néant » (cadrage §7 axe 4)

25–30 paires `(demande → refs attendues)` en trois familles, correspondant aux trois chemins du
flow : demandes structurées (doivent partir en ⑥), sensorielles (doivent partir en ⑦), hors
catalogue (doivent sortir l'état vide). Métriques :

- **Taux d'aiguillage correct** ④/⑤ → ⑥ vs ⑦ : la santé de la cascade elle-même.
- **Rappel@200** de ⑥ et ⑦ contre un balayage exhaustif : critère **≥ 0,99**.
- **Calibrage des seuils ⑨** : aucune demande hors catalogue ne doit passer en « directe » ; aucune
  demande sensorielle valide ne doit tomber en « aucun résultat ». C'est ce jeu qui fixe les seuils.
- **Précision@5 du classement final** : doit rester **strictement stable** avant/après. Toute
  variation signale une fuite du vecteur dans le classement — un bug, pas une amélioration.

---

## 9. À trancher

1. **Portée du flow.** Le schéma est l'instance galerie (② « sculpture ou peinture », artiste cité).
   PAP n'a pas d'étape ② : sa machine à états va de `request` à `matching` (`src/types/index.ts:114`).
   Noyau SaaS commun — ② devenant une capacité optionnelle déclarée par client, comme la photo
   (cadrage §2) — ou cible à transposer telle quelle dans PAP ?
2. **Cascade stricte ou pont sémantique.** Une demande mixte part en ⑥ et ne touche jamais le
   vecteur (§2). Trois options : (a) cascade stricte comme dessinée, la moins chère et la plus
   prévisible ; (b) ⑥ puis **re-classement vectoriel à l'intérieur** de l'ensemble filtré quand la
   demande porte du texte résiduel non consommé par ④ — un embedding de plus, le filtre exact reste
   maître ; (c) fusion parallèle systématique, la plus chère et la moins lisible.
3. **Seuils initiaux.** 0,35 / 0,55 sont des points de départ. Ils ne seront crédibles qu'après le
   premier passage du jeu doré.

---

## 10. Option future — embedding image

`type` étant déjà dans la PK de `article_vecteur`, indexer les packshots ne demande **aucune
migration**. Usages par ordre de valeur : (a) proposer des `accords` par harmonie visuelle sur un
catalogue trop gros pour être curé à la main ; (b) « montrez-moi quelque chose comme ça » depuis une
photo ; (c) détecter les quasi-doublons à l'ingestion.

**Réserve** : la similarité visuelle n'est **pas** la complémentarité. Une veste marine est « proche »
d'un pantalon marine, mais une tenue veut de la complémentarité, pas de la ressemblance. L'embedding
image ne doit alimenter qu'une **liste de candidats d'accords** validée par une règle ou un humain —
jamais l'accord final.

---

## 11. Trouvé au passage

1. **`detecterIntention` ne remplit jamais `motsCles`** (`src/lib/intent.ts:202` renvoie `[]` en
   dur). Le bloc de scoring `+15 mots-clés` (`src/lib/matching.ts:68-75`) est donc **inatteignable
   en mode 100 % code** — et sur la demande d'exemple du projet, `besoinAnalyseIA` renvoie `false`,
   donc le LLM n'est pas appelé et ce score ne se déclenche jamais. **L'étape ④ du flow est
   aujourd'hui plus faible qu'elle n'en a l'air.** Correction ~10 lignes, coût 0, gain immédiat.
2. **Aucun champ n'encode la saison ni la disponibilité.** « cet été » et « en stock » sont deux
   critères que le visiteur exprime spontanément et que le modèle de données ne peut pas porter.
3. **`VOCABULAIRE_*` sont dérivés de `CATALOGUE` au build** (`catalogue.ts:932-944`) puis injectés
   dans le prompt (`api/analyze.ts:79-83`) : c'est exactement le mécanisme qui casse au-delà de
   quelques centaines de SKU. La table `vocabulaire` (§5.1) le remplace.
