# MHA Widget Hub — développement et déploiement local

## Développement local

Après une modification dans `src/`, `styles/`, `assets/` ou les loaders :

```bash
npm run dev
```

Cette commande synchronise la copie frontend locale :

```text
custom_components/mha_widget_hub/frontend/
```

## Validation complète

```bash
npm run build
```

Cette commande exécute :

```text
check syntaxe → tests → check sync → sync frontend
```

## Déploiement vers Home Assistant par SSH

Le déploiement ne se connecte pas à HACS. Il copie le dossier de l’intégration vers le serveur Home Assistant avec `rsync`.

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
MHA_DEPLOY_SOURCE=custom_components/mha_widget_hub/
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
```

Le ZIP exclut notamment :

```text
.git
.DS_Store
__MACOSX
node_modules
dist
```
