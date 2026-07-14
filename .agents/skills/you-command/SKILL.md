---
name: you-command
description: Consolider les apprentissages durables d’une tâche dans la mémoire persistante du projet. Utiliser explicitement avec $you-command à la fin d’une session, après une décision architecturale importante, après la résolution d’un bug subtil, ou lorsque l’utilisateur demande de rafraîchir la mémoire du projet.
---

# Consolider la mémoire du projet

Mettre à jour la mémoire destinée aux futures instances de Codex sans transformer
le fichier en journal de travail.

## 1. Charger le contexte utile

1. Trouver la racine du projet courant.
2. Lire `AGENTS.md`, `.codex/PROJECT_MEMORY.md` et
   `.codex/LEARNING_INBOX.md` lorsqu’ils existent.
3. Examiner seulement les preuves pertinentes accessibles : conversation courante,
   changements Git, tests, fichiers modifiés et décisions explicites de l’utilisateur.
4. Ne jamais prétendre connaître des tâches ou conversations auxquelles cette session
   n’a pas accès.

## 2. Sélectionner les apprentissages

Ne retenir qu’une connaissance qui est :

- spécifique à ce projet ou à la collaboration avec l’utilisateur ;
- susceptible d’être utile dans plusieurs tâches futures ;
- difficile à redécouvrir rapidement dans le code ;
- appuyée par une décision explicite, le code actuel, un test ou une observation vérifiée.

Écarter les résumés chronologiques, les détails d’exécution ponctuels, les bonnes
pratiques génériques, les hypothèses faibles et les informations déjà évidentes dans
le code. Si aucun apprentissage durable n’existe, ne modifier aucun fichier.

## 3. Choisir la bonne destination

- Modifier `AGENTS.md` uniquement pour une instruction de travail impérative et durable.
- Modifier `.codex/PROJECT_MEMORY.md` pour une décision, une contrainte, un invariant,
  un piège, une préférence UX ou une raison architecturale durable.
- Placer dans `.codex/LEARNING_INBOX.md` une observation prometteuse qui demande
  encore confirmation.
- Placer une règle propre à un sous-arbre dans son `AGENTS.md` ou sa mémoire locale
  lorsqu’une telle structure existe, plutôt que de globaliser la règle.

## 4. Consolider au lieu d’accumuler

1. Chercher les doublons et les contradictions avant d’ajouter une entrée.
2. Corriger ou remplacer l’entrée existante lorsque la connaissance a évolué.
3. Marquer explicitement une ancienne décision comme remplacée si son historique
   explique encore l’architecture actuelle.
4. Conserver le pourquoi, les conséquences pratiques et les chemins de fichiers utiles.
5. Dater les décisions et indiquer `confirmé`, `probable` ou `à vérifier` lorsque le
   niveau de confiance apporte une information réelle.
6. Préférer un petit patch ciblé à une réécriture du fichier.

Le code et les tests actuels ont priorité sur la mémoire. Une instruction explicite de
l’utilisateur a priorité sur une ancienne préférence enregistrée. Ne jamais modifier
silencieusement une décision en cas de contradiction non résolue : exposer le conflit
et demander une décision si elle change matériellement l’architecture.

## 5. Vérifier et rendre compte

Après modification :

1. Relire les sections modifiées.
2. Vérifier que le Markdown reste lisible et qu’aucune instruction ne se contredit.
3. Résumer les éléments ajoutés, corrigés, fusionnés, déplacés ou volontairement
   ignorés, avec leur justification.
4. Préciser que la mémoire mise à jour est disponible dans la tâche courante et sera
   rechargée au démarrage des prochaines tâches via `AGENTS.md`.
