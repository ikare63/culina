> **29 octobre 2026 : migration gelée.** Lire [MIGRATION-SANS-PERTE.md](MIGRATION-SANS-PERTE.md) avant toute action. La comparaison ne remplace plus automatiquement une version divergente ; les anciennes instructions de synchronisation directe sont suspendues. Aucune sauvegarde réelle ni restauration sur appareil validée.

# Synchronisation privée — corrections proposées

Branche : `audit/private-sync-20261028`. Aucune fusion ni publication automatique. Aucune sauvegarde personnelle modifiée pendant l’audit.

Le nouveau moteur `lenaic-sync.js` utilise uniquement le dépôt privé `ikare63/data` et un jeton de session limité à ce dépôt. Il conserve des secours locaux uniques et vérifie des copies dans `data/recovery/` avant de remplacer un JSON principal. Les conflits sont bloqués jusqu’à une résolution explicite.

Le téléphone doit être récupéré en premier. Après revue et intégration : faire un export local sur chaque appareil ; comparer sur le téléphone, envoyer sa version complète après vérification ; sur le PC choisir **Charger GitHub**, jamais envoyer d’abord une ancienne copie. L’automatisation est facultative, disponible après une première réussite et tant que l’onglet reste ouvert. Ne pas vider le stockage des appareils.

Le compte rendu détaillé, les limites, les étapes de récupération et les tests sont dans `AUDIT-SYNCHRONISATION.md` sur la branche d’audit du dépôt `bureau-genealogique`. Le moteur y possède 17 tests avec données fictives. Les huit pages principales ont passé le test de démarrage en DOM simulé ; la validation sur les données réelles des appareils reste à faire après intégration.
