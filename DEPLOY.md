# MHA Widget Hub — développement et déploiement local

## Développement local

Après une modification dans `src/`, `styles/`, `assets/` ou les loaders :

```bash
npm run dev
```

Cette commande génère, à la demande, une copie frontend locale :

```text
custom_components/mha_widget_hub/frontend/
```

La racine du dépôt (`mha-widget-hub*.js`, `src/`, `styles/`, `assets/`) reste la
source canonique. Le dossier ci-dessus est ignoré par Git et ne doit jamais être
modifié ou committé manuellement.

## Validation complète

```bash
npm run build
```

Cette commande exécute les validations sans modifier les sources suivies, puis
construit une intégration complète sous :

```text
dist/integration/custom_components/mha_widget_hub/
```

`npm run check` génère son frontend dans un dossier temporaire, compare chaque
fichier avec les sources canoniques, puis nettoie ce dossier.

## Déploiement vers Home Assistant par SSH

Le déploiement ne se connecte pas à HACS. Il construit d'abord l'intégration dans
un dossier temporaire propre, puis la copie vers Home Assistant avec `rsync`. Il
ne dépend donc pas d'une copie frontend déjà présente dans le dépôt.

Exemple :

```bash
MHA_DEPLOY_HOST=192.168.1.50 \
MHA_DEPLOY_USER=julien \
npm run deploy:dev
```

Chemin distant par défaut :

```text
/config/custom_components/mha_widget_hub
```

Variables disponibles :

```bash
MHA_DEPLOY_HOST=192.168.1.50
MHA_DEPLOY_USER=julien
MHA_DEPLOY_PORT=22
MHA_DEPLOY_PATH=/config/custom_components/mha_widget_hub
MHA_DEPLOY_SOURCE=custom_components/mha_widget_hub
```

Exemple complet :

```bash
MHA_DEPLOY_HOST=192.168.1.50 \
MHA_DEPLOY_USER=julien \
MHA_DEPLOY_PORT=22 \
MHA_DEPLOY_PATH=/config/custom_components/mha_widget_hub \
npm run deploy:dev
```

## Release ZIP

```bash
npm run release:zip
```

Sortie :

```text
dist/mha-widget-hub.zip
dist/mha-widget-hub-hacs.zip
```

`mha-widget-hub.zip` est l'archive d'installation manuelle : elle se décompresse
à la racine de la configuration Home Assistant et contient `custom_components/`.
`mha-widget-hub-hacs.zip` contient directement les fichiers de l'intégration,
car HACS l'extrait dans `custom_components/mha_widget_hub/`.

Le ZIP exclut notamment :

```text
.git
.DS_Store
__MACOSX
node_modules
dist
```

Son contenu installable conserve la structure publique attendue :

```text
custom_components/mha_widget_hub/
├── manifest.json
├── fichiers Python et traductions
├── brand/
└── frontend/
    ├── mha-widget-hub.js
    ├── loaders
    ├── src/
    ├── styles/
    └── assets/
```

Le staging propre reste inspectable sous `dist/release/`. Chaque exécution le
supprime et le reconstruit, ce qui empêche un fichier obsolète de survivre dans
une release.
