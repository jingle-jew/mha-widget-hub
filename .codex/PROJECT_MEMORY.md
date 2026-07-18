# Mémoire persistante — MHA Widget Hub

Dernière consolidation : 2026-07-18

Ce fichier contient les connaissances durables qui seraient coûteuses à redécouvrir.
Le code et les tests actuels restent la source de vérité. Les instructions de travail
appartiennent à `AGENTS.md`.

## Décisions et raisons

### 2026-07-15 — Faire du mouvement une signature visuelle MHA

- **Statut :** confirmé.
- **Décision :** les animations MHA sont volontairement lentes, lisibles et
  perceptibles. Le mouvement ne sert pas seulement à masquer une transition :
  il participe à la signature visuelle du produit.
- **Pourquoi :** une animation trop brève devient un simple changement d'état
  et perd sa valeur d'orientation, de continuité et d'identité.
- **Conséquence :** privilégier des durées longues et des courbes douces pour
  les transitions visuelles; conserver les changements de layout stables et
  animer les propriétés de rendu ciblées. Les interactions directes doivent
  rester immédiatement acquittées, même lorsque leur évolution visuelle se
  poursuit lentement. Pour les médias, l'audio et les commandes ne sont jamais
  retardés; la représentation visuelle peut volontairement rester en retrait
  le temps de charger ses ressources et de terminer une animation premium.

### 2026-07-15 — Garder la page Média autonome

- **Statut :** confirmé.
- **Décision :** la page Média et tout son contenu forment un système autonome.
  Leur structure, leurs états, leurs comportements et leurs styles doivent être
  possédés par la page Média. La page consomme le contrat visuel du thème actif
  comme une entrée interchangeable, mais ne dépend ni de l'implémentation d'un
  thème particulier ni d'éléments définis ailleurs dans l'application.
- **Pourquoi :** un contrat local évite que la cascade, l'ordre des feuilles ou
  l'évolution d'un widget/thème externe modifie silencieusement la page Média.
- **Conséquence :** les thèmes sont des fournisseurs consommés par la page, pas
  des propriétaires de sa structure ou de son comportement. Chaque entrée
  thématique doit pouvoir être remplacée ou absente grâce à un contrat et des
  fallbacks locaux complets. Ne pas réutiliser un élément préexistant si cette
  réutilisation crée une dépendance; préférer un composant appartenant à la page
  Média. Les couplages historiques encore présents avec
  `media-widget.css` ou les tokens du dock sont une dette à réduire par correctifs
  ciblés; ne pas les étendre.

### 2026-07-15 — Centraliser les contrôles de choix MHA

- **Statut :** confirmé.
- **Décision :** les nouveaux sélecteurs, cases et radios MHA partagent les
  primitives de `src/ui/form-controls.js` et leur contrat visuel dans
  `styles/components/form-controls.css`. Le champ HTML natif reste la source de
  vérité masquée; le déclencheur, la liste et l'indicateur visibles sont rendus
  par MHA à partir des tokens sémantiques du thème.
- **Pourquoi :** un simple habillage CSS d'un `select` laisse son menu ouvert à
  l'apparence de l'appareil, tandis que le contrat hybride conserve valeurs,
  clavier et accessibilité sans renoncer à une UX MHA cohérente.
- **Conséquence :** éviter de recréer localement un `select`, une checkbox ou un
  radio visible; étendre ces primitives quand un nouveau besoin commun apparaît.
  Les renderers de `src/widget-config/` consomment les adaptateurs
  `createSelectControl` et `createRadioControl` fournis par
  `widget-config-popup.js`, afin de rester découplés du DOM interne des contrôles
  partagés.

### 2026-07-18 — Composer les nuages météo avec chaque paysage

- **Statut :** confirmé.
- **Décision :** chaque WebP météo fournit un petit profil de composition
  déclaratif dans `weather-background-assets.js` : horizon perçu, hauteur utile
  du champ nuageux, début et douceur du fondu, intensité de la brume. Le
  générateur conserve ses profondeurs `far`/`mid`/`near`, son mouvement et sa
  génération procédurale, mais construit quelques grandes nappes chevauchées
  dont la distribution est pilotée par la météo et ce profil de scène.
- **Pourquoi :** une hauteur globale et de petits nuages placés indépendamment
  donnent l'impression d'une couche posée devant la photographie. Le contrat de
  composition permet aux nappes basses de se dissoudre autour du relief et à la
  brume de prolonger naturellement l'atmosphère déjà présente dans le WebP.
- **Conséquence :** garder les paysages comme source visuelle principale; pour
  calibrer ou ajouter un asset météo, ajuster d'abord son profil de composition
  plutôt que créer une exception CSS ou analyser l'image au runtime. Les
  changements fins d'opacité et de vent se synchronisent en place; seul un
  changement du nombre de nappes réutilise le crossfade de scène existant.

### 2026-07-18 — Résoudre les scènes météo depuis une registry de paysages

- **Statut :** confirmé.
- **Décision :** `weather-background-assets.js` est la source de vérité des
  paysages météo. Chaque entrée déclare son identifiant, son libellé, sa
  preview, ses WebP par moment (`dawn` à `night`) et ambiance (`clear`,
  `overcast-light`, `overcast-high`), son profil de composition et un point de
  raccord optionnel pour de futurs assets d'hiver. Le paysage sélectionné est
  persisté dans la configuration de la page sous `weatherLandscapeId`, avec
  `alpine-lake` comme fallback.
- **Pourquoi :** séparer le paysage photographique des effets procéduraux
  conserve le moteur météo existant tout en rendant la sélection testable et
  extensible. Le resolver ne construit jamais une URL supposée : il ne choisit
  que parmi les assets déclarés et applique une chaîne de fallback explicite.
- **Conséquence :** ajouter un paysage passe d'abord par cette registry et par
  le settings-panel de la page Météo, sans créer de stockage parallèle. Le
  panneau dev garde la condition et le moment comme deux axes indépendants; son
  override `_mha_weather_period_override` appartient uniquement au mock local.

### 2026-07-18 — Supporter les paysages météo procéduraux dans la registry

- **Statut :** confirmé.
- **Décision :** une entrée de `weather-background-assets.js` déclare désormais
  explicitement son `type` (`raster` ou `procedural`) et son `renderer`. Le
  renderer `celestial-gradient` possède ses sept profils temporels, ses
  interpolations et ses fallbacks solaire/lunaire dans
  `weather-celestial-gradient.js`; il ne dépend pas des ambiances issues des
  conditions météo.
- **Pourquoi :** le paysage de ciel doit partager sélection, persistance,
  composition et couches d'effets avec les WebP sans simuler une URL d'image ni
  dupliquer le moteur météo.
- **Conséquence :** la `sceneKey` procédurale reste structurelle. Les changements
  de couleurs, positions des astres, phase lunaire et opacité des étoiles sont
  synchronisés en place par variables CSS lorsque la structure météo ne change
  pas; ils ne recréent donc ni le fond ni les nuages/précipitations. Toute future
  entrée procédurale doit préserver cette séparation entre renderer temporel et
  effets météo indépendants.

### 2026-07-18 — Partager le popup de contrôle détaillé des lumières

- **Statut :** confirmé.
- **Décision :** les widgets `toggle` et `toggle-slider` ouvrent le même popup
  natif depuis leur zone informative uniquement lorsque leur entité appartient
  au domaine `light`. Le popup lit séparément les capacités de luminosité,
  température et couleur, et conserve ses vues presets, couleur personnalisée
  et configuration dans une seule surface. Son contrat persistant appartient au
  widget sous `lightControl`; un événement remonté au shell utilise la chaîne de
  sauvegarde des widgets existante.
- **Pourquoi :** séparer le déclencheur informatif des contrôles directs évite
  les ouvertures accidentelles depuis le toggle ou le slider. Le filtrage par
  domaine préserve intégralement `switch` et `input_boolean`, tandis que le
  filtrage par capacités empêche d'exposer des commandes HA non supportées.
- **Conséquence :** toute évolution du contrôle lumière doit rester centralisée
  dans `src/light-control/` et `src/ha/light.js`, sans dupliquer de popup dans les
  widgets. Les mises à jour HA réutilisent le DOM ouvert et ignorent les modèles
  inchangés; le builder de service élimine les appels sans changement réel. Les
  presets d'ambiance choisissent un seul modèle de couleur HA (`color` ou
  `colorTemperature`) auquel peut s'ajouter la luminosité. Les contrôles continus
  du popup réutilisent `createSlider` et son API publique, y compris pour les
  bornes Kelvin dynamiques et l'orientation responsive; ils ne recréent pas de
  range local ni ne dépendent de la structure DOM interne du composant.

## Pièges connus

- Les contrôles MHA vivent dans le Shadow DOM du hub. Pour détecter un clic
  extérieur depuis `document`, utiliser `event.composedPath()` plutôt que le
  seul `event.target` : ce dernier est retargeté vers l'hôte et peut faire
  fermer un menu avant le `click` de son option.
- Sous iOS, les sections vitrées du settings-panel créent chacune un contexte
  d'empilement à cause de leur `backdrop-filter`. Un menu local doit donc
  relever temporairement sa section parente; augmenter uniquement le `z-index`
  interne de la liste ne peut pas la faire dépasser les sections suivantes.
- Un `backdrop-filter` enfant ne produit pas un blur fiable lorsqu'il reste
  imbriqué dans les sections et la sheet iOS déjà filtrées. Les listboxes MHA
  ouvertes sont donc portalisées à la racine du même Shadow DOM, positionnées
  en `fixed`, puis réattachées à leur contrôle à la fermeture. Elles échappent
  ainsi au backdrop root imbriqué sans perdre leurs événements ni leurs styles.
- `media-page.css` est chargé avant les feuilles propres aux widgets. Les
  exceptions des cartes « Lecteurs disponibles » doivent donc rester strictement
  ciblées et assez spécifiques pour neutraliser, lorsque nécessaire, les règles
  immersives tardives de `media-widget.css` sans modifier les vrais widgets média.
- L'artwork principal de la page Média n'est pas imbriqué dans un
  `.mha-media-widget`. La racine de palette doit donc accepter le parent
  compatible le plus proche parmi `.mha-media-widget` et `.mha-media-page` : la
  page récupère ainsi son contraste Now Playing, tandis que les artworks des
  « Lecteurs disponibles » restent isolés dans leur propre widget.
- Dans `semantic-tokens.css`, ne pas redéfinir le `--mha-primary-surface`
  spécialisé de OneUI avec `var(--mha-surface-primary)` : OneUI mappe déjà
  `--mha-surface-primary` vers `--mha-primary-surface`. La double référence
  forme un cycle de custom properties, invalide la surface calculée et fait
  retomber les widgets sur leurs anciens fallbacks visuels.

## Préférences UX et produit

- Les sélecteurs, menus, radios et cases à cocher visibles doivent privilégier
  un rendu MHA contrôlé et cohérent entre appareils plutôt que l'apparence
  native du système. Les primitives HTML natives peuvent rester sous-jacentes
  pour la sémantique, le clavier et l'accessibilité, mais leur présentation
  doit appartenir au design system MHA.
- Le panneau de réglages propre à la page Média ne propose plus de sélecteur
  « Style visuel » : son apparence suit le thème actif. La normalisation de
  `visualStyle` reste tolérante pour charger les configurations historiques.
- Les widgets média `2×2` et `4×2` ont trois contrats visuels natifs : iOS
  conserve l'artwork comme objet sur un champ coloré; OneUI et Material
  partagent une composition immersive en lecture ou en pause, Material la
  déclinant avec ses propres tokens. Dans les autres états, OneUI et Material
  révèlent la surface primaire normale du widget. Leur palette de contenu est
  dérivée de l'artwork avec un contraste minimal de 4.5:1 et mise en cache par
  URL. Le grand variant conserve l'identifiant persistant `media-panel`, mais
  normalise désormais les anciens `4×4` vers un contrat vertical `4×6` en
  trois zones : artwork flexible en haut, titre/album au centre et surface de
  transport compacte en bas. Sa pastille de transport affiche l'état localisé
  du lecteur plutôt que le nom générique de l'application. Le widget réutilise
  la palette de contraste extraite pour Now Playing afin de piloter ensemble le
  texte, la progression, les contrôles et la surface de transport; l'ancienne
  palette reste active jusqu'à l'échantillonnage du prochain artwork. Les
  contrats `2×2` et `4×2` restent indépendants.
- Dans les widgets média standard `2×2` et `4×2`, le bouton volume alterne entre
  les modes `playback` et `volume`. Le mode de repos `volume-only` appartient
  uniquement aux cartes de la section « Lecteurs disponibles »; il ne doit pas
  être utilisé comme mode de retour d'un widget standard.
- Dans les réglages d’apparence OneUI, « Opacité des widgets » contrôle
  `--mha-oneui-primary-surface-opacity` de 0 à 100 %. La valeur est persistée
  localement sous `mha-oneui-primary-surface-opacity`; son défaut reste 68 %.
  Pendant un geste actif sur ce slider, le panel, son scrim et le blur du
  dashboard sont masqués, tandis que le contrôle reste au premier plan à sa
  position stable pour permettre un aperçu direct des surfaces.
- Les widgets météo principaux (`kind: weather`) proposent, uniquement sous
  OneUI, un mode de surface `default` ou `dynamic`. `dynamic` est le défaut de
  création et de normalisation; un choix explicite `default` reste préservé.
  Le mode `default` consomme `--mha-primary-surface` et adapte les tokens de
  contenu au contraste sémantique sans assombrir les icônes météo, d'humidité
  ou de précipitations, dont les parties monochromes restent blanches; le mode
  dynamique conserve la surface météo bleue expressive.
  Ce réglage partagé couvre les conditions actuelles et les prévisions horaires
  ou journalières, sans s'étendre à iOS, aux métriques, au radar ou au bref météo.
- Sur la carte météo Vent 2×2, la boussole est une information contextuelle de
  fond : elle doit rester centrée, atténuée, derrière les textes et remplir la
  carte à une échelle proche des cadrans ClockWidget analogiques. La direction
  cardinale localisée doit apparaître au-dessus de la vitesse. La boussole ne
  doit pas constituer une rangée de contenu distincte.
- Les libellés météo longs « Couverture nuageuse », « Intensité des
  précipitations », « Rayonnement solaire » et « Durée d’ensoleillement »
  utilisent jusqu’à deux lignes plutôt qu’une troncature sur une seule ligne.
  Leur icône reste alignée avec la première ligne. En français, la hauteur de
  neige est libellée « Accumulations ».
- La carte « Bref météo » est le widget `weather-metric` avec
  `metricKey: summary`. Ce libellé est utilisé dans les gestionnaires Grid et
  météo, même si la clé technique demeure `summary`. Elle utilise le format
  `4×2` et un flux `configure-first` sur Grid. Le widget distinct
  `weather-narrative` reste masqué des deux catalogues.
- Sur la carte elle-même, le résumé météo n’affiche pas d’eyebrow « Bref
  météo » : ce nom appartient aux gestionnaires. Le narratif `4×2` commence en
  haut de sa section, immédiatement sous le séparateur.
- Le « Bref météo » sépare deux responsabilités : sa phrase principale résume
  toujours les conditions de la période courante, ou de la période suivante
  après le milieu de la période courante; son ancienne logique prioritaire sert
  uniquement de ligne d’avis secondaire. Lorsqu’un avis existe, cette ligne est
  précédée d’un petit glyphe triangulaire d’avertissement. Les avis de pluie et
  de neige emploient une heure locale approximative lorsque les prévisions sont
  horaires (« vers 14 h »), puis retombent sur la période naturelle (« ce soir »)
  avec des prévisions quotidiennes. Ce choix de source reste automatique : la
  configuration du « Bref météo » expose uniquement l’entité météo et ne
  persiste pas de `forecastType`; le sélecteur horaire/quotidien demeure réservé
  aux widgets météo qui affichent réellement une prévision choisie.
- Les surfaces du dock OneUI, standard comme compactes, sont légèrement
  translucides, floutées et teintées par la couleur d’accent active du thème.
  La pastille de l’élément actif reprend cette teinte avec une intensité plus
  forte pour préserver la hiérarchie de sélection.
- Le verre OneUI utilise un grain volontairement visible mais fin et poudreux :
  texture fractale dense à quatre octaves, répétée à `56px`, opacité `.14` et
  fusion `soft-light`. Ce voile couvre aussi les sheets/panels OneUI sans leur
  ajouter de bordure ou d’ombre. Avec le wallpaper animé OneUI par défaut, le
  grain des widgets reste à `.14` entre 50 et 100 % d’opacité de surface, puis
  diminue linéairement jusqu’à `0` entre 50 et 0 %. Les images personnalisées,
  les panels et les cartes « Lecteurs disponibles » conservent leur grain fixe.
- Le canvas généré de OneUI clair reste légèrement assombri par ses couleurs de
  base, sans réduire l’intensité des blobs, afin que les surfaces primary
  laiteuses conservent un contraste lisible avec le fond.
- Le screensaver OneUI floute le véritable wallpaper dans les deux modes. Le
  reset `filter: none` du canvas clair ne s’applique que lorsque le screensaver
  est masqué, afin de ne pas neutraliser son blur commun de `18px`.
- `primary-surface` OneUI reproduit le matériau fortement diffusé de One UI
  Home : clair froid et laiteux, sombre bleu nuit très absorbant, blur `46px`
  et saturation `118%`. Sa couleur et celle du dock OneUI latéral/compact
  partagent les mêmes tokens de stops; la surface primary les compose à `68%`
  pour rester légèrement plus transparente que le dock sans atténuer son
  contenu. Son blur et sa brightness restent propres au rôle primary. Les rôles
  panel et `on-primary` restent indépendants tant qu’ils ne sont pas
  explicitement remappés.
- La section « Lecteurs disponibles » consomme la couleur dominante de
  l'artwork principal avec une hiérarchie panneau < carte active < carte active
  sélectionnée. En OneUI et Material, ces surfaces locales dérivées de la
  palette remplacent les surfaces thématiques du panneau et des lecteurs
  `playing/paused`; elles ne sont pas des voiles composés par-dessus celles-ci.
  Les surfaces thématiques préexistantes restent réservées aux lecteurs
  inactifs, éteints, indisponibles ou inconnus. Sous iOS seulement, la teinte
  reste un voile très faible afin de préserver le verre transparent et son blur.
  Lorsqu'un nouvel artwork change la palette, les couleurs du panneau, de la
  carte active et de ses contrôles évoluent par un fondu local de `1000ms`, sans
  animation de layout ni recalcul du blur. L'ancienne palette reste active tant
  que le nouvel artwork n'a pas été chargé et échantillonné. Une erreur d'image
  ou un canvas non lisible conserve cette dernière palette valide; elle n'est
  retirée qu'après confirmation réelle de l'absence d'artwork.
- Le wallpaper d'artwork de la page Média conserve lui aussi l'image précédente
  pendant le chargement de la suivante. La nouvelle URL n'est publiée à la
  couche CSS qu'après chargement et décodage, et une requête devenue obsolète ne
  peut pas remplacer un artwork plus récent. Cette continuité évite d'exposer
  brièvement le wallpaper du thème entre deux chansons. Une fois prête, la
  nouvelle image apparaît par un crossfade de `1000ms` entre deux couches
  d'artwork superposées : le fondu ne transite jamais par le fond du thème.
- Un état HA `idle`, `stopped`, `off`, `unavailable` ou `unknown` ne remplace pas
  immédiatement un état média actif sur le même lecteur. MHA conserve artwork,
  métadonnées et état visuel pendant une fenêtre de confirmation continue de
  `5000ms`, puis effectue son propre rafraîchissement même sans nouvel événement
  HA. Le cache est vidé après confirmation et n'est jamais partagé entre deux
  entités, afin d'éviter à la fois les flashes et les artworks périmés.
- Le contraste du contenu Now Playing est calculé contre une approximation de
  l'artwork une fois composé avec l'overlay sombre du wallpaper, et non contre
  les pixels bruts de la pochette. La palette des surfaces continue d'utiliser
  les couleurs originales; seul le choix clair/sombre du texte et des contrôles
  tient compte de la surface réellement perçue derrière eux.
- En OneUI, les surfaces locales de repli des lecteurs inactifs restent
  visuellement alignées sur le dock sans dépendre du composant dock.
- En OneUI et Material, les cartes « Lecteurs disponibles » conservent une
  vignette carrée locale : artwork réel pendant la lecture, vignette vide avec
  glyphe pour les lecteurs inactifs ou éteints, comme en iOS. Elles ne doivent
  pas hériter de la composition immersive des widgets média `4×2`.
- En OneUI, les tuiles de la Now Bar réutilisent la matière canonique du dock
  latéral/compact : même surface, bordure, ombre et filtre. Les autres thèmes
  conservent leur contrat de surface propre.
- En OneUI sombre seulement, les contours et ombres externes des panels, sheets
  et popups sont neutralisés afin d’éviter un rendu tridimensionnel. La
  profondeur vient des surfaces internes; le calibrage OneUI clair reste
  inchangé.
- Sur la page Média mobile, le dock reste masqué pendant toute l’ouverture de la
  sheet « Lecteurs disponibles »; son empreinte structurelle est conservée pour
  éviter un reflow.
