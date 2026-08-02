# Widget conseiller — principe de fonctionnement & socle commun

**Destinataire : Yvanol.** But : comprendre l'anatomie d'un widget, isoler ce qui est
commun aux deux réalisations (galerie d'art / prêt-à-porter), et poser la projection
**SaaS + personnalisation client**. Volontairement synthétique. Aucun développement à ce stade.

Références : `main` = widget Galeries Bartoux (art) · `claude/retail-pap-widget-i8lh5s` =
widget André Laurent (PAP), déployé en preview.

---

## 1. Ce qu'est un widget, en une phrase

Un **entonnoir conversationnel** qui prend un visiteur sans demande précise, normalise son
besoin, le confronte au **vrai catalogue du client**, lui projette le résultat en image, et
produit un **lead qualifié**.

Principe directeur, identique dans les deux : **le code fait tout ce qui peut l'être
gratuitement ; l'IA n'intervient que là où elle est indispensable.** La recommandation ne
sort jamais du LLM — elle sort du catalogue via un scoring en code. Le LLM ne fait que
comprendre, rédiger et rendre.

---

## 2. Le parcours : une colonne vertébrale commune

| Phase | Galerie (9 étapes) | PAP (11 étapes) | Nature |
|---|---|---|---|
| Accueil | `welcome` | `welcome` | Code |
| Captation d'intention | `type` (sculpture/peinture + recherche libre) | `request` (demande libre + 6 amorces) | Code |
| Qualification | *(implicite dans la description photo)* | `qualify` (2–4 questions, celles déjà répondues sont sautées) | Code + IA |
| Contexte visuel | `photo` (la pièce) — **avant** le matching | `photo` (la personne) — **après** la sélection | Code |
| Analyse | `POST /api/analyze` | `POST /api/analyze` | **IA** (JSON structuré) |
| Matching | `matching` → `matching.ts:rankCatalogue` | `matching` → `matching.ts:classerArticles` | **Code, 0 $** |
| Restitution | `presentation` + `POST /api/justify` | `brief` + `POST /api/brief` | **IA** (texte) |
| Sélection | `results` (carrousels par artiste, max 5) | `selection` + `outfit` (« complétez la tenue », max 8) | Code |
| Projection | `render` → `POST /api/render` | `render` → `POST /api/render` | **IA** (image) |
| Conversion | `lead` | `lead` | Code |
| Clôture | `done` | `done` | Code |

**Écart structurel à retenir** : la photo ne joue pas le même rôle. En galerie elle est une
**entrée du matching** (elle mesure le mur → filtre les œuvres trop grandes, via
`placement.ts` et `pxPerCm`). En PAP elle n'est qu'une **entrée du rendu** (elle n'influence
pas quels vêtements sont proposés). → « Photo » n'est pas une étape fixe, c'est une
**capacité à deux rôles possibles**, à déclarer par client.

---

## 3. Les invariants d'architecture (vrais dans les deux)

1. **Machine à états** `useReducer` + routeur d'étapes, avec **cascades d'invalidation**
   (changer la demande invalide l'analyse, le matching, la sélection) et **anti-course**
   (un rendu qui arrive après un changement de sélection est ignoré).
2. **Catalogue = source de vérité et laisse du LLM.** Les sorties du modèle sont filtrées
   contre des whitelists dérivées du catalogue (artistes, vocabulaire). Un produit inexistant
   ne peut pas être recommandé, par construction.
3. **Prompts à deux niveaux** : corps éditables sans redéploiement (Vercel Edge Config,
   page `/admin`) + **squelettes verrouillés dans le code** (rôle, injection catalogue,
   règles anti-déformation) qu'un opérateur ne peut pas casser.
4. **Dégradation gracieuse** : sans clé API, réseau coupé ou modèle en erreur, le widget
   continue en mode démo (matching code + visuel de secours). Jamais d'écran d'erreur.

S'y ajoutent, communs : cache par hash + dédup des requêtes en vol (`aiClient.ts`),
réduction d'image ≤ 1280 px avant envoi, accessibilité (`role="dialog"`, focus, Échap,
`prefers-reduced-motion`), timeouts, plafond de body à 3,5 Mo.

---

## 4. Commun vs variable — le détail qui décide du SaaS

### 4.1 Schéma catalogue

| Champ | Galerie (`Oeuvre`) | PAP (`Article`) | Verdict |
|---|---|---|---|
| Identité | `id`, `titre`, `artiste` | `id`, `nom` | **Commun** (libellé + marque/auteur) |
| Visuel | `image`, `gradient` | `image`, `gradient` | **Commun** (+ dégradé de secours) |
| Prix | `prix` (string) | `prix` (number) | **Commun**, à normaliser en nombre |
| Taxonomie | `tag` (2 valeurs) | `categorie` (7 valeurs) | **Commun**, cardinalité variable |
| Vocabulaire contrôlé | `motsCles[]`, `couleurs[]` | `motsCles[]`, `couleurs[]`, `matieres[]`, `occasions[]` | **Commun**, extensible |
| Description | `descriptionCourte` | `descriptionCourte` + **`descriptionRendu`** | Commun ; PAP ajoute le fragment de prompt image |
| **Contrainte métier** | `dims{h,l,p}` + `orientation` | `slots[]` + `accords[]` + `tailles[]` | **C'est ici que tout diverge** |

→ ~80 % du schéma est commun. La divergence est concentrée dans **un seul bloc**.

### 4.2 Deux familles de contrainte métier

- **Contrainte physique (continue)** — galerie : l'œuvre tient-elle dans l'espace mesuré ?
  Géométrie cm→pixels, `scoreTaille` élimine au-delà de 120 % de la zone.
  *Se retrouvera en : mobilier, cuisine, immobilier.*
- **Contrainte combinatoire (discrète)** — PAP : les pièces sont-elles portables ensemble ?
  `tenue.ts` : chaque article revendique des **emplacements** (`Slot`) ; deux articles en
  conflit ne se bloquent pas, **ils se remplacent, et l'UI l'explique**.
  *Se retrouvera en : joaillerie, optique, équipement, packs B2B.*

Une troisième verticale tombera dans l'une ou l'autre. **Deux moteurs de contrainte
couvrent l'essentiel du marché visé** — c'est le meilleur argument en faveur du SaaS.

### 4.3 Les trois appels IA — contrat identique

| Appel | Galerie | PAP | Forme |
|---|---|---|---|
| Compréhension | `/api/analyze` | `/api/analyze` | JSON contraint par `responseSchema`, temp 0,2 |
| Rédaction | `/api/justify` | `/api/brief` | Texte, temp 0,6 |
| Projection | `/api/render` | `/api/render` | Image (2+ images en entrée : contexte + produit) |

Même nombre, mêmes formes, mêmes garde-fous. Seuls les **prompts et les schémas de sortie**
changent. C'est l'invariant le plus solide du dossier.

---

## 5. Le problème mesuré

Diff PAP vs `main` : **5 691 / 4 026 lignes**, **4 fichiers inchangés sur ~50**,
**≈ 3 % de réutilisation littérale** (`api/_lib/gemini.ts`, `api/_lib/validate.ts`,
`src/lib/gradient.ts`, `src/main.tsx`).

Autrement dit : **l'architecture s'est transférée à 100 %, le code à 0 %** — parce qu'il
n'a jamais été factorisé pour l'être. On a un archétype et deux implémentations
indépendantes. Les §2 à §4 montrent que l'invariant existe bel et bien ; il n'est
simplement pas encore extrait.

---

## 6. Projection SaaS + personnalisation

**Noyau mutualisé** (un seul code, tous les clients) : machine à états + routeur d'étapes,
kit UI, `aiClient` (cache/dédup), garde-fous HTTP, store de prompts à deux niveaux,
dégradation gracieuse, traitement d'image, accessibilité, capture de lead, télémétrie,
admin, **les deux moteurs de contrainte** (physique / combinatoire).

**Quatre couches de personnalisation client** — c'est le contrat à définir :

| Couche | Contenu | Effort | Qui |
|---|---|---|---|
| 1. Marque | Couleurs, typo, logo, textes, ton éditorial | Faible | Config |
| 2. Catalogue | Mapping vers le schéma commun + vocabulaire contrôlé + enrichissement | **Fort** | Connecteur + IA |
| 3. Domaine | Questions de qualification, règles de scoring, moteur de contrainte à activer | Moyen | Config + points d'extension |
| 4. Rendu | Prompt image : ce qui doit être **préservé** vs **remplacé** | Faible-moyen | Config |

\+ **séquence d'étapes déclarée** (lesquelles, dans quel ordre, rôle de la photo, essayage on/off).

**Le vrai coût n'est pas le widget, c'est la couche 2.** 26 entrées curées à la main
aujourd'hui, contre 3 000–50 000 SKU chez un client réel : ingestion (Shopify, PrestaShop,
flux Merchant, CSV), enrichissement LLM par produit à rejouer à chaque évolution du
catalogue, **synchro stock** (une reco en rupture détruit la confiance), et qualité des
visuels (l'essayage exige des packshots détourés que beaucoup de clients n'ont pas).
→ Prévoir un **« score de préparation données »** du prospect : outil de qualification
commerciale *et* ligne d'onboarding facturable.

**Prochaine étape logique** : extraire le noyau depuis les deux widgets existants et les y
brancher tous les deux. C'est le seul moyen de valider empiriquement les frontières
ci-dessus.

---

## 7. Axes techniques à couvrir

| # | Axe | État | À faire |
|---|---|---|---|
| 1 | Récupération d'infos | Pas de RAG : catalogue statique en whitelists + scoring code | Seuil de SKU où ça casse ; hybride filtres durs + recherche sémantique au-delà |
| 2 | Génération | JSON contraint, temp 0,2 / 0,6, fallback modèle sur 404 | Retry, validation de schéma en sortie, streaming |
| 3 | Prompt engineering | **OK** (2 niveaux, cf. §3.3) | Versionnage + rollback, prompts par tenant, A/B |
| 4 | Éval qualité | **Néant** | Jeu doré par verticale, régression sur changement de prompt, LLM-juge, budget qualité chiffré |
| 5 | Coûts & latence | Cache + dédup + downscale, timeouts 45/55/30 s | Cache serveur, plafond budget/widget, SLO p50/p95 (rendu = 10–30 s) |
| 6 | Monitoring | `console.log` seul | Métriques/widget (sessions, complétion, coût, latence, erreurs), alerting |
| 7 | Sécurité | Clé fournisseur serveur only (OK) ; endpoints IA **publics non authentifiés**, throttle mémoire, mdp admin partagé | §8 |
| 8 | Scalabilité | **Quota Gemini partagé par projet** → un pic client affame les autres ; compteurs mémoire cassés au scale-out | Cloisonnement par tenant, rendu async + file, dégradation en mode démo |
| 9 | Qualité des données | Cf. couche 2, §6 | Connecteurs, enrichissement, synchro stock |
| 10 | UX | OK sauf : **widget embarquable inexistant** (aujourd'hui = clone de site complet) | Embed `<script>` + Shadow DOM, i18n, masquage de latence |
| 11 | Tests | **Zéro** (ni test, ni lint, ni CI) | Typecheck+lint bloquants, unitaires sur scoring/intention, Playwright par archétype |

Atouts : 1, 3, 5. Trous à assumer et dater : 4, 6, 11.

---

## 8. Points de vigilance

**Écarts démo → produit** : `StepLead.tsx:24` — le formulaire de lead **n'envoie rien** ·
aucune analytics ni A/B → **preuve d'efficacité impossible** · README annonce
`gemini-3-flash` et ~0,14 $/session, le code utilise `gemini-3.1-pro-preview` (chiffre
sous-estimé) · README annonce un moteur FLUX/fal.ai **absent du code** · `.env.example`
documente 3 variables, le code en lit 9.

**Clés & anti-abus** — limiter par IP est le bon réflexe mais c'est le signal le plus faible
(CGNAT/mobile = IP partagée → faux positifs ; un abus fait tourner ses IP). En couches :
① clé d'embarquement par widget + **origines autorisées** (barrière principale ; elle est
publique par nature, c'est le quota qui protège) · ② **plafond de budget par widget** avec
bascule en mode démo plutôt que coupure · ③ **quota par session** (jeton signé) : N
essayages / N analyses — c'est ce qui borne le coût réel · ④ quota IP en dernière couche ·
⑤ alerting + audit + rotation/révocation. Prérequis : un KV — le compteur mémoire actuel ne
peut pas porter ça.

**Conformité, deux régimes** — *conseil sans photo* : régime léger (mention d'info, base
légale, conservation des leads, DPA). *Essayage* : le widget demande « Ajoutez une photo de
vous » et envoie l'image à Gemini → consentement explicite, **AIPD probablement
obligatoire**, conservation nulle/courte, non-rétention et non-entraînement côté modèle,
droit à l'effacement, exclusion des mineurs. **Ne jamais ajouter d'identification** (art. 9
RGPD, biométrie). **AI Act** : transparence. Recherche « consentement / RGPD / conservation »
dans le code : **0 occurrence**.

**Urgent, indépendant du reste** : le déploiement preview expose des endpoints publics non
authentifiés qui consomment le budget Gemini. Sans développement : activer la Deployment
Protection Vercel **ou** retirer `GOOGLE_API_KEY` des previews (bascule propre en mode démo).
À faire avant de diffuser un lien de démo.

---

## 9. Axes de développement futur

À explorer **une fois le noyau extrait et deux ou trois clients en production** — pas avant :

- **Spécification comme donnée** : `widget.config.json` (marque, étapes, source catalogue,
  prompts, moteur de contrainte) + points d'extension déclarés. Cible : une variante de
  verticale en moins d'un jour-homme.
- **Plan de contrôle** : tenants, clés API, quotas, budgets, analytics, webhook CRM.
- **Génération assistée** : un agent d'entretien (paramètres client, crawl du site) produit
  la config ; un agent codeur ne remplit que les points d'extension déclarés ; jeux de tests
  dorés en barrière ; déploiement en preview, promotion humaine en production.

**Condition d'entrée** : construire le widget n°3 (mobilier ou optique) et mesurer la
réutilisation. Sous 60 % de code partagé, il faut refactoriser — pas orchestrer.

---

## 10. À trancher

1. Verticale n°2 (mobilier = contrainte physique, réutilise le plus ; optique/joaillerie = combinatoire).
2. Clés fournisseur mutualisées ou par tenant (l'axe 8 pousse vers le cloisonnement).
3. Seuil de bascule SaaS ↔ sur-mesure.
4. Taille de catalogue au-delà de laquelle les whitelists en prompt ne tiennent plus (axe 1).
5. Définition chiffrée du budget qualité (axe 4).
6. Client pilote réel pour calibrer les chiffres.
