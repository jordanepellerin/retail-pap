# Visuels produits

Les fichiers `*.svg` de ce dossier sont des **placeholders générés**, pas des
photos. Chacun est une silhouette vectorielle stylisée, dans la vraie couleur et
la vraie matière de l'article correspondant du catalogue.

Ils permettent à la démonstration de tourner sans aucune dépendance externe,
mais ils ont une limite importante :

> **Le rendu IA reste de faible qualité tant que les vraies photos ne sont pas
> déposées.** Le modèle image reproduit ce qu'il voit sur la référence produit ;
> à partir d'un aplat vectoriel, il ne peut pas restituer une matière, un
> tombé ni un détail de couture crédibles.

## Passer aux vraies photos

1. Photographier ou exporter chaque produit **détouré sur fond clair uni**,
   au format portrait (3:4 recommandé), 1200 px de côté long minimum.
2. Déposer le fichier ici sous le nom exact du slug, en `.jpg` :
   `costume-lin-beige.jpg`, `derby-cuir-noir.jpg`, etc. — la liste complète des
   slugs est celle des `.svg` présents dans ce dossier.
3. Dans `src/data/catalogue.ts`, remplacer l'extension du champ `image` de
   l'article : `/produits/costume-lin-beige.svg` → `/produits/costume-lin-beige.jpg`.
   (Un remplacement global `.svg` → `.jpg` suffit si toutes les photos sont là.)

Le champ `gradient` de chaque article sert de repli visuel : si un fichier est
absent ou illisible, l'interface affiche le dégradé plutôt qu'une image cassée.

## Régénérer les placeholders

```bash
npm run visuels
```

Le script est `scripts/generer-visuels.mjs`. Il contient sa propre table
(slug, gabarit, couleurs, matière) : après un ajout au catalogue, ajouter la
ligne correspondante dans `VISUELS` puis relancer la commande. Il écrit aussi
`public/exemples/mannequin.svg`, la silhouette proposée à l'étape photo.
