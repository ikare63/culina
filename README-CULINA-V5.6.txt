Culina v5.6 — fichiers à mettre à la racine du dépôt GitHub :
- index.html
- app.js
- style.css
- recettes.json
- favicon.ico
- manifest.webmanifest
- service-worker.js
- dossier img/ complet

Nouveautés v5.6 :
- ajout, modification et suppression de recettes depuis l’onglet Recettes ;
- les recettes personnelles et modifications sont conservées dans localStorage (culina-recipes-custom-v1), sans modifier recettes.json ;
- rappel « un fruit ? » à partir de 12 h 45 et 20 h, avec report de 15 minutes ;
- notification navigateur en plus si l’autorisation a déjà été accordée.

Les rappels locaux fonctionnent tant que Culina est ouvert (y compris en arrière-plan si le navigateur ne suspend pas la page). Si le navigateur ferme/suspend totalement le site, GitHub Pages ne peut pas garantir un réveil à heure fixe sans service de push externe.
