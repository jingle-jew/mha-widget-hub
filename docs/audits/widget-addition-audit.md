# Widget Addition Audit

## Target

Converger vers :

- `my-widget.js`
- `my-widget.css`
- manifest exporté
- une seule couture d'enregistrement dans `src/widgets/widget-module-registry.js`

## État après refactor

Pour un widget standard non configurable, le coût minimal est maintenant :

1. créer le fichier JS widget et exporter `WIDGET_MODULE`
2. créer le fichier CSS widget
3. ajouter l'import du module dans `src/widgets/widget-module-registry.js`
4. ajouter le module dans `WIDGET_MODULES`

Pour un widget configurable, il faut en plus :

1. exposer `module.config`
2. fournir `createDraft`
3. fournir `build`
4. fournir `renderFields`

## Coutures restantes

- `src/widgets/widget-module-registry.js` reste la couture unique d'agrégation
- l'auto-agrégation n'est pas encore mise en place

## Vérification importante

`src/widget-config/widget-config-popup.js` ne nécessite plus d'ajout de branche spécifique par widget configurable.
