# MHA Theme Studio

Theme Studio est un outil de développement local isolé du runtime de production MHA. Il réutilise `dev.html` dans une iframe pour afficher le vrai custom element MHA, le vrai manifest de styles et les vrais composants de preview.

## Lancer

Depuis la racine du dépôt :

```bash
npm run theme-studio
```

Ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173). Le serveur écoute uniquement sur loopback et s'arrête avec `Ctrl+C`.

Vérifications rapides :

```bash
npm run theme-studio:check
npm run theme-studio:test
```

## Architecture auditée

- Les sources sont `src/` et `styles/`.
- `src/settings/theme-registry.js` est le registre canonique : il associe un thème à ses CSS, variantes et CSS de dock.
- `src/styles/style-manifest.js` dérive le manifest à partir du registre; il n'existe donc pas de liste de thèmes indépendante à maintenir.
- `tools/sync-integration-frontend.mjs` synchronise les sources vers `custom_components/mha_widget_hub/frontend/`. Le Theme Studio ne fait pas partie du bundle MHA.
- `dev.html` initialise le runtime avec un mock Home Assistant; il sert de scène de preview et reçoit les overrides temporaires via les propriétés CSS du custom element.
- Les styles de dock sont `styles/themes/*-dock.css`, chargés séparément par le manifest.

## Contrat éditable

Le studio expose le catalogue complet des tokens MHA natifs détectés dans les CSS de thèmes, matériaux raw, tokens sémantiques de base et docks réellement référencés par le registre. Les métadonnées explicites sont déclarées dans `schema/theme-controls.js`; les autres tokens natifs sont catalogués automatiquement avec leur fichier, sélecteur et ligne.

Les aliases de compatibilité et les références purement dérivées (`var(...)`) ne sont pas présentés comme des sources éditables. Les tokens natifs complexes restent visibles en lecture seule; les tokens numériques, couleurs simples, modes de fusion et booléens sont validés et éditables.

Pour rendre un nouveau token éditable :

1. vérifier qu'il est réellement consommé par le runtime;
2. ajouter une entrée avec un fichier et un sélecteur exacts dans `schema/theme-controls.js`;
3. choisir un contrôle validable (`range`, `select` ou `color-alpha`);
4. ajouter un test si le token introduit un comportement particulier.

Les valeurs complexes comme les gradients et `box-shadow` restent volontairement en lecture seule. Chaque thème enregistré bénéficie du catalogue automatique de ses tokens natifs; un thème sans CSS source resterait sélectionnable mais sans contrôle éditable.

## Sauvegarde et sécurité

Les sliders changent uniquement le style de la preview. `Voir le diff` affiche les tokens, valeurs, fichiers et lignes avant toute écriture. `Appliquer au repo` vérifie les valeurs, les chemins autorisés et le hash de chaque fichier lu. Une modification externe provoque un conflit et bloque l'écriture.

La duplication et la création affichent d'abord un plan de fichiers. Le registre est mis à jour; le manifest est recalculé depuis le registre. Après création d'un thème, exécuter `npm run sync:frontend` pour régénérer la copie Home Assistant.

Import/export utilise un JSON versionné. L'import est validé sans écriture automatique. Les images de preview sont conservées uniquement dans le navigateur et ne sont jamais écrites dans le dépôt.

## Limites de la première version

Il n'y a pas de suppression de thème, d'éditeur libre de CSS/gradients/ombres complexes, de commit Git, d'accès réseau, d'authentification ou de terminal intégré. L'undo/redo reste en mémoire dans la session.
