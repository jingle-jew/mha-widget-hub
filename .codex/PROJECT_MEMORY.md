# Mémoire persistante — MHA Widget Hub

Dernière consolidation : 2026-07-29

Ce fichier contient les connaissances durables qui seraient coûteuses à redécouvrir.
Le code et les tests actuels restent la source de vérité. Les instructions de travail
appartiennent à `AGENTS.md`.

## Décisions et raisons

### 2026-07-29 — Initialiser MHA avec Aperçu, Météo et Lecteurs média

- **Statut :** confirmé.
- **Décision :** lorsqu’aucune page n’est encore persistée, MHA crée dans cet
  ordre une page `overview`, une page `weather` à peuplement automatique et une
  page `media-players`. Leurs noms de première ouverture sont localisés :
  `Overview / Weather / Media Players` en anglais, `Aperçu / Météo / Lecteurs
  média` en français et `Vista general / Clima / Reproductores multimedia` en
  espagnol. La première page conserve l’identifiant interne `home` pour les
  fallbacks historiques.
- **Pourquoi :** une installation vierge doit commencer sur l’expérience
  spécialisée Aperçu et exposer immédiatement les deux autres destinations
  principales, sans page Grid générique préalable.
- **Conséquence :** les pages déjà enregistrées ne sont ni remplacées ni
  réordonnées. Une migration ancienne qui contient encore des widgets Grid les
  conserve sur une page Grid `home`; seuls les états réellement vierges
  reçoivent le nouveau trio.

### 2026-07-29 — Afficher le contexte courant dans la status bar

- **Statut :** confirmé.
- **Décision :** la status bar conserve sa date et son heure existantes, mais
  retire les anciennes informations de développement (`Grid foundation`, mode
  responsive, colonnes et unités). Sa zone gauche affiche le nom canonique de
  la page active. Dans Aperçu, une pièce sélectionnée complète temporairement
  ce contexte sous la forme `Aperçu › Salon`.
- **Pourquoi :** la barre doit décrire l'endroit courant dans MHA sans dupliquer
  le contenu des widgets, de la Now Bar ou du dock, ni exposer des métriques
  internes du moteur de layout.
- **Conséquence :** le nom de page reste possédé par le modèle de pages et se
  resynchronise lors des changements de page et du renommage actif. Le détail
  de pièce appartient au runtime local d'Aperçu, n'est pas persisté et disparaît
  avec la fermeture ou l'expiration de la sélection. Les libellés longs sont
  tronqués avant la date et l'heure plutôt que de les repousser. En mode pill,
  la barre est positionnée dans le host MHA, qui commence déjà après la sidebar
  Home Assistant : elle ne doit donc jamais ajouter
  `--mha-ha-sidebar-reserved-inline-start`. Cette réserve reste nécessaire aux
  surfaces `fixed` au viewport, notamment la top bar et le screensaver.

### 2026-07-29 — Configurer l’horloge météo et partager la source du screensaver

- **Statut :** confirmé.
- **Décision :** la variante `clock/digital-weather` suit un flux
  `configure-first` lorsqu’elle est choisie dans le gestionnaire, alors que les
  autres variantes d’horloge restent en placement direct. Sur le screensaver,
  cette même variante ne possède ni réglage ni stockage météo propre : elle
  reçoit l’entité effectivement utilisée par la Now Bar, soit la première
  entité météo sélectionnée encore disponible, et se rafraîchit sur les mises à
  jour Home Assistant sans reconstruire l’horloge.
- **Pourquoi :** le contrat déclarait déjà cette variante comme configurable,
  mais son ancien flux `direct` contournait le popup. Le composant partagé du
  screensaver était par ailleurs créé sans `hass` ni `entityId`, ce qui rendait
  systématiquement sa ligne météo vide.
- **Conséquence :** ajouter l’horloge numérique météo ouvre le sélecteur météo;
  choisir ou modifier les entités météo de la Now Bar pilote aussi l’horloge du
  screensaver. Aucune préférence supplémentaire n’est introduite.

### 2026-07-29 — Présenter la Now Bar comme une notification du thème

- **Statut :** confirmé.
- **Décision :** les tuiles de la Now Bar reprennent la géométrie des
  notifications de leur thème de référence : capsules pour OneUI et Material
  You, rectangle arrondi historique pour iOS. Chaque tuile place à gauche un
  visuel dans le composant `.mha-icon`, afin d'hériter sans réglage propre de la
  forme d'icône globale sélectionnée dans Apparence. En iOS, chaque tuile
  contient un échantillon visuel isolé de la vraie `.mha-background`, aligné sur
  sa position à l'écran, puis flouté et recouvert d'une teinte translucide.
  L'échantillon reste dans un masque intermédiaire qui hérite du rayon de la
  tuile et isole sa peinture; l'`overflow` de la carte seule ne suffit pas à
  contenir de façon fiable le filtre composité dans WebKit. Le
  `backdrop-filter` direct est désactivé sur les tuiles iOS : une tuile ne doit
  jamais intégrer les autres cartes empilées dans son flou. Le rôle dense
  `--mha-shell-nowbar-surface` reste le repli avant que l'échantillon soit prêt;
  `--mha-shell-nowbar-wallpaper-tint` calibre ensuite la lisibilité sans ajouter
  de dégradé propre à la tuile. Les visuels hors artwork utilisent une surface
  d'accent opaque et la couleur de contraste de la palette; les glyphes météo
  deviennent monochromes dans ce contexte afin que toutes leurs composantes
  restent lisibles sur cette bulle.
- **Contenu :** Média montre l'artwork uniquement pendant une lecture active et
  lorsqu'une image valide existe, sinon une icône générique de musique;
  Météo montre le glyphe de la condition courante; Calendrier compose le jour et
  le mois court localisé sur deux lignes. Calendrier récupère ses événements dès
  que l'économiseur devient visible et complète la réponse du service avec le
  prochain événement exposé directement par l'entité `calendar.*`; une date sans
  heure `YYYY-MM-DD` est interprétée à minuit local, jamais à minuit UTC. Les
  états de repli utilisent une icône sémantique propre à chaque type de tuile.
- **Pourquoi :** rapprocher la Now Bar des notifications OneUI, Material et iOS
  tout en rendant chaque information identifiable d'un regard et en réutilisant
  les contrats visuels existants du produit.
- **Conséquence :** le stylage n'ajoute aucun réglage et ne modifie ni
  l'empilement, ni la navigation, ni les interactions de la Now Bar. Le contrat
  de fiabilité Calendrier restaure uniquement la lecture du prochain événement.
  Sur tablette et desktop, le voile du screensaver reste plein écran, mais son
  espace de contenu ajoute à gauche la réserve Home Assistant réellement
  mesurée afin de centrer l'horloge et la Now Bar dans la zone hors-sidebar.
  Les textes et visuels de repli doivent conserver l'identité sémantique de leur
  clé (`calendar` reste Calendrier, par exemple) et ne doivent jamais
  réintroduire les anciens contenus de démonstration comme une fausse tuile
  Sécurité.

### 2026-07-29 — Résumer l’éclairage de la Now Bar par pièces éclairées

- **Statut :** confirmé.
- **Décision :** l’élément « Lumières allumées » de la Now Bar ne compte plus
  les entités `light.*`. Sans ajouter de réglage, il compte les pièces équipées
  dans lesquelles au moins une lumière autorisée est `on`. Une pièce équipée
  contient au moins une lumière assignée directement à son aire Home Assistant
  ou héritant de l’aire de son appareil; les lumières sans aire sont exclues.
- **Pourquoi :** Home Assistant expose comme `light.*` aussi bien les ampoules
  physiques que des groupes représentant un luminaire ou une pièce. Compter les
  entités doublait donc fréquemment la perception de l’éclairage, tandis
  qu’exclure automatiquement tous les groupes aurait confondu leurs intentions.
- **Conséquence :** zéro pièce produit « Toutes les lumières sont éteintes. »;
  une ou deux pièces nomment les pièces; trois pièces ou plus affichent le
  nombre; lorsque toutes les pièces équipées sont éclairées, la Now Bar affiche
  « Toutes les pièces sont éclairées. ». La découverte réutilise le cache des
  registres de `area-discovery.js`, respecte les permissions MHA, se prépare sur
  les mises à jour Home Assistant et se rafraîchit au plus une fois par minute.

### 2026-07-28 — Séparer la publication HACS du déploiement de développement

- **Statut :** confirmé.
- **Décision :** HACS installe exclusivement l'asset de release
  `mha-widget-hub-hacs.zip`, déclaré par `zip_release: true` et `filename` dans
  `hacs.json`. Cette archive place directement l'intégration complète à sa
  racine. Le déploiement local `npm run deploy:dev` reste un flux indépendant :
  avant `rsync`, il crée si nécessaire le seul dossier distant
  `mha_widget_hub` et en rend récursivement l'utilisateur SSH propriétaire,
  avec une élévation `sudo` interactive uniquement lorsque les droits HACS
  `root:root` l'exigent.
- **Pourquoi :** le frontend d'intégration est généré depuis les sources
  canoniques et volontairement ignoré par Git. Télécharger l'archive source
  d'une branche ou d'un commit peut donc laisser l'intégration sans frontend;
  avec le HACS observé, un hash court utilisé comme branche produisait en plus
  un téléchargement `refs/heads/<hash>` en 404. Inversement, un `rsync` lancé
  comme utilisateur SSH ne peut ni créer ni modifier un dossier recréé par HACS
  sous `root:root`.
- **Conséquence :** toute release HACS doit être réellement publiée avec
  `mha-widget-hub-hacs.zip`; un tag ou un brouillon sans cet asset n'est pas
  installable. Le test de packaging verrouille le nom et l'activation du mode
  ZIP. Le déploiement de développement limite toute modification de
  propriétaire au chemin validé se terminant par `/mha_widget_hub`, ne
  préserve ni owner ni group via `rsync`, et normalise les permissions
  distantes à `755` pour les dossiers et `644` pour les fichiers.

### 2026-07-27 — Doser la teinte du verre des widgets iOS

- **Statut :** confirmé.
- **Décision :** Liquid Glass est le contrat visuel canonique de tout le thème
  iOS. Le slider « Teinte du verre » dose de `0` à `100` la matière de la coque
  externe des widgets génériques entre les endpoints Liquid et Frosted :
  surface normale/édition, bordure, ombre, reflet et grain. Le dock, la barre
  d’état, les panels, les réglages, les contrôles internes, les textes, icônes,
  rayons, géométries et la page Média restent strictement Liquid sur toute la
  course.
- **Décision spéciale :** le sélecteur indépendant « Teinte des widgets » vaut
  `transparent` ou `tinted`. `transparent` fait hériter la coque générique
  dosée aux six formats Calendrier et au widget principal `kind: weather`;
  `tinted` donne aux Calendriers une coque claire blanche ou sombre presque
  noire et à Météo un gradient adapté à la condition HA courante. Les métriques,
  le radar et le bref météo restent hors de ce sélecteur.
- **Pourquoi :** le dosage doit rester un réglage de matière des widgets, pas un
  second thème iOS, et les surfaces expressives Calendrier/Météo doivent pouvoir
  être activées sans déplacer le dosage du verre générique.
- **Conséquence :** `mha-ios-glass-tint` / `data-ios-glass-tint` transportent le
  pourcentage et `mha-ios-widget-tint` / `data-ios-widget-tint` transportent le
  choix spécial. `data-ios-glass` et les anciennes clés Liquid/Frosted ne
  pilotent plus le CSS de production; ils restent synchronisés comme contrat de
  migration/compatibilité aux endpoints. Le slider met à jour les propriétés
  CSS en direct sans reconstruire la grille ni le panneau de réglages; le
  sélecteur spécial resynchronise seulement le panneau. À `0`, la coque utilise
  un endpoint Liquid propre aux widgets (`.20` d’alpha en clair, `.07` en sombre)
  plutôt que la surface primaire globale (`.32`/`.12`); les panels, contrôles et
  autres surfaces iOS ne changent donc pas. « Teinte du verre » reste le dernier
  contrôle de la section Apparence. Pendant son geste actif,
  il partage avec le slider d’opacité OneUI l’état de prévisualisation des
  surfaces : scrim, sheet et blur du settings-panel sont masqués, tandis que le
  slider reste visible et stable devant le dashboard. Les sélecteurs CSS de cet
  état doivent combiner `data-theme-style`, `is-settings-open` et
  `is-widget-surface-previewing` afin de surpasser aussi bien le blur d’ouverture
  du settings-panel que `widget-surface-backdrop.css`, chargé plus tard. L’état
  neutralise `filter`, `-webkit-filter`, la transformation du dashboard et le
  backdrop de la section qui contient le slider.

### 2026-07-27 — Limiter la famille Calendrier à six formats natifs

- **Statut :** confirmé.
- **Décision :** la catégorie `calendar` est un seul module registry-driven qui
  expose six compositions fortement inspirées des widgets Calendrier de la
  référence : date monumentale `2×2`, mini-mois `2×2`, date et prochain
  événement `2×2`, agenda compact `4×2`, agenda détaillé `4×4` et chronologie
  deux jours `4×4`. Les formats panoramiques `8×4` et `4×8` sont explicitement
  exclus et ne doivent pas être réintroduits implicitement par redimensionnement.
- **Pourquoi :** conserver la hiérarchie et la densité de la référence sans
  élargir le contrat global des tailles ni créer des panneaux hors norme.
- **Conséquence :** date et mini-mois restent directs et sans entité; les quatre
  variantes événementielles utilisent un flux `configure-first` avec sélection
  multiple de calendriers autorisés. Le domaine `calendar` appartient aux
  permissions MHA Admin, les événements `calendar.get_events` sont normalisés et
  mis en cache par connexion/fenêtre, et le contenu laisse le shell posséder la
  surface, le contour et l’ombre via les tokens sémantiques du thème.

### 2026-07-22 — Fusionner les interrupteurs et booléens uniquement dans MHA

- **Statut :** confirmé.
- **Décision :** MHA Admin conserve `switch` et `input_boolean` comme deux
  domaines distincts pour les permissions. Dans les configurateurs des widgets
  MHA qui supportent les deux domaines, leurs entités sont regroupées sous le
  seul type visible « Interrupteur ».
- **Pourquoi :** les deux domaines partagent la même interaction marche/arrêt
  dans les widgets, mais leurs permissions doivent rester administrables
  séparément.
- **Conséquence :** le regroupement ne transforme jamais l'identifiant de
  l'entité. Les appels Home Assistant continuent de résoudre le domaine réel de
  chaque `entityId`; les anciennes configurations qui utilisent le type
  `input_boolean` sont normalisées vers le type d'affichage `switch`.

### 2026-07-29 — Unifier l’entrée en édition sur tous les layouts

- **Statut :** confirmé.
- **Décision :** sur mobile, tablette et desktop, le long-press d'entrée en
  édition est disponible sur la grille vide et sur les surfaces tap-only des
  widgets. Les contrôles de manipulation directe (`slider`, `toggle`, champs et
  outils de redimensionnement) restent exclus. Le geste ne capture ni ne bloque
  le pointeur avant son activation; mouvement et scroll conservent leur
  priorité. Après une activation réussie, seul le clic consécutif du widget
  d'origine est neutralisé. Le bouton crayon global reste masqué hors édition
  sur tous les layouts; une fois l'édition active, `×` à droite et `+` à gauche
  reprennent sur desktop la géométrie compacte et les ancrages bas de la
  tablette.
- **Pourquoi :** l'entrée et la sortie du mode édition doivent suivre un même
  contrat sur tous les appareils. Les écrans denses offrent en plus peu de
  grille vide, mais détourner un slider ou un switch de son geste natif rendrait
  les contrôles imprévisibles. La suppression ponctuelle du clic permet aux
  libellés, boutons, scènes, caméras et contrôles média de conserver leur clic
  court sans déclencher leur action au relâchement d'un long-press.
- **Conséquence :** les futurs widgets tap-only bénéficient automatiquement du
  geste sur tous les layouts. Tout nouveau contrôle qui possède son propre
  press/drag doit être ajouté au contrat d'exclusion du coordinateur central et
  couvert par ses tests, sans créer de gestionnaire de long-press propre au
  widget.

### 2026-07-29 — Stabiliser le layout lorsque la sidebar Home Assistant s’ouvre

- **Statut :** confirmé.
- **Décision :** en mode responsive `auto`, l’identité mobile/tablette/desktop
  est résolue depuis la largeur du viewport du navigateur, pas depuis la
  largeur courante du host MHA. Les métriques de pistes continuent toutefois
  d’utiliser le rectangle réel restant dans le panneau.
- **Pourquoi :** une sidebar HA dockée réduit le host sans modifier le viewport.
  Près du breakpoint desktop de `1400px`, utiliser le host faisait basculer la
  grille de desktop à tablette et réduisait fortement son nombre de colonnes;
  les widgets grossissaient alors précisément au moment où l’espace disponible
  diminuait.
- **Conséquence :** ouvrir la sidebar HA peut encore produire une petite
  variation proportionnelle des widgets, mais ne change plus à elle seule le
  layout responsive. Un vrai redimensionnement de la fenêtre continue de
  franchir normalement les breakpoints.

### 2026-07-19 — Composer le popup lumière autour de deux colonnes stables

- **Statut :** confirmé.
- **Décision :** sur tablette et desktop, le popup lumière conserve une même
  géométrie externe et deux colonnes : les contrôles rapides à gauche, la
  couleur à droite. Le réglage `orientation` est exposé par dataset et pilote
  uniquement la composition complète de la colonne gauche (ordre, axe des
  sliders, disposition des ambiances et proportions) à partir d'une seule
  structure DOM. La colonne couleur reste commune aux deux modes.
- **Pourquoi :** limiter l'orientation à un slider laissait les ambiances et les
  proportions hors du contrat de configuration, tandis que dupliquer les vues
  aurait créé deux chemins de synchronisation Home Assistant fragiles.
- **Conséquence :** luminosité et température restent dans les contrôles
  rapides; saturation, teinte et roue colorimétrique partagent un seul état HSV
  synchronisé avec Home Assistant. Les futurs ajustements d'alignement doivent
  rester dans la grille CSS pilotée par `data-orientation`, sans créer une
  seconde implémentation JavaScript.

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

### 2026-07-28 — Piloter le travail visuel par l'activité réelle

- **Statut :** confirmé.
- **Décision :** `src/core/activity-coordinator.js` est le propriétaire unique
  des états runtime `active`, `idle-visible`, `covered` et `hidden`, de
  l'observation viewport partagée et des cadences seconde/minute/jour. Les
  callbacks du dashboard ne tournent pas sous une surface couvrante, ceux des
  overlays ne tournent que lorsqu'ils sont visibles et aucun timer de cadence
  ne subsiste lorsque le document est caché. Le retour visible déclenche une
  seule réconciliation. Les composants doivent consommer ce contrat via
  `component-cadence.js` et `widget-runtime-activity.js` plutôt que créer un
  timer répétitif ou un `IntersectionObserver` local. L'état `covered` dérive
  exclusivement des états logiques du screensaver et des settings ainsi que de
  `_widgetSurfaceOpen`; les classes et datasets correspondants sont des miroirs
  de présentation, jamais des sources de vérité.
- **Pourquoi :** les mises à jour Home Assistant, animations, requêtes caméra et
  reconstructions DOM continuaient auparavant même lorsqu'elles ne pouvaient
  produire aucun pixel utile. Centraliser l'activité évite ce travail tout en
  conservant les animations lentes qui font partie de l'identité MHA lorsque la
  surface redevient pertinente.
- **Conséquence :** `hass-update-router.js` calcule une seule fois les entités
  modifiées, puis route chaque composant selon ses dépendances et sa signature;
  un dashboard couvert ou un document caché diffère son rendu jusqu'à la
  réconciliation. La caméra suspend timers et requêtes lorsqu'elle est couverte,
  cachée ou hors viewport, puis reprend une fois. Le CSS runtime met en pause
  les animations inobservables. Les cadences Calendrier, Bref météo, Aperçu et
  Média partagent le coordinateur. Les surfaces lourdes fermées restent non
  montées et les feuilles de style déjà conformes au manifeste conservent leur
  nœud DOM lors d'un rerender racine. Tout nouveau rendu coûteux doit préférer
  une synchronisation en place et une signature stable avant de reconstruire
  son DOM ou réassigner ses ressources. `syncWidgetSurfaceOpenState()` est le
  seul propriétaire de `_widgetSurfaceOpen`; un rerender racine doit l'appeler
  dès qu'il retire les anciennes surfaces. Le réveil désactive le screensaver
  avant de réconcilier l'activité. Enfin, la révélation initiale ne doit jamais
  attendre indéfiniment une animation suspendue : elle termine immédiatement
  en état `covered`/`hidden`, possède une borne temporelle et resynchronise une
  fois l'activité ainsi que la pastille active du dock.

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

### 2026-07-29 — Garder Aperçu spécialisé avec des portées Grid locales par section

- **Statut :** confirmé.
- **Décision :** le type de page `overview` possède son propre rendu dans
  `src/pages/overview-page.js`. Sur tablette/desktop, son contrat logique reste
  `6 + 4`; sur mobile, la grille de pièces reçoit le nombre de colonnes de la
  Grid responsive active et les appareils restent dans une sheet quatre
  colonnes. Pendant leur édition, Appareils et Pièces deviennent chacune une
  `.mha-grid` locale et empruntent le moteur commun de placement et de
  drag-and-drop. Appareils conserve une portée quatre colonnes avec ajout,
  suppression, redimensionnement et configuration; Pièces conserve ses boutons
  fixes dans la grille responsive et ajoute seulement l'action système
  `Masquer/Afficher` à l'outil de déplacement commun.
- **Pourquoi :** réutiliser le moteur Grid évite un second contrat de gestes et
  de positions, mais sa portée doit rester explicitement liée au contexte
  `summary` ou `area:<id>` afin de ne pas détourner les widgets d'une autre page
  ou d'une autre pièce.
- **Conséquence :** sans pièce sélectionnée sur tablette/desktop, `page.widgets`
  représente le Résumé. Chaque pièce persiste son contenu édité dans
  `page.config.areas[areaId].deviceWidgets`, avec les entités découvertes
  supprimées dans `removedEntityIds`; les nouvelles entités découvertes sont
  encore ajoutées automatiquement. Les positions Appareils utilisent des clés
  synthétiques séparées par contexte, layout et grille `4x100`; les positions
  Pièces utilisent la portée `overview-rooms:rooms`, le layout et le nombre de
  colonnes responsive avec `100` lignes. Les pièces masquées restent dans la
  portée d'édition afin de pouvoir être réaffichées, mais ne sont pas rendues
  hors édition. Cette portée n'expose ni ajout ni cible de suppression par drag.
  Lorsqu'une pièce est masquée, conserver l'ordre visuel courant des autres
  boutons, placer la pièce ciblée après les pièces déjà masquées, puis repacker
  et persister toute la carte de positions afin de combler immédiatement le trou.
  Hors édition, Overview ne contient volontairement pas de `.mha-grid`;
  `grid-runtime.js` doit alors ignorer ses widgets spécialisés
  au lieu de leur réappliquer les dimensions et positions de la grille globale.
  Sinon, au retour sur Overview, une carte 8 colonnes peut créer des pistes CSS
  implicites dans la grille Appareils 4 colonnes. La découverte à cadence minute
  calcule maintenant une signature stable sans son horodatage de requête et ne
  reconstruit le DOM que lorsque son modèle a réellement changé; elle ne doit
  donc plus servir de réparation implicite d'un layout invalide.
  Sur tablette/desktop, l'action `+` de cette portée est placée à
  droite dans l'en-tête Appareils et reste la cible de suppression du drag; le
  bouton d'ajout flottant global y est masqué. Sélection, sheet et cadence restent
  du runtime non persisté. La découverte de `area-discovery.js` continue
  d'appliquer les permissions MHA avant le rendu.

### 2026-07-28 — Compacter verticalement après une réduction de hauteur

- **Statut :** confirmé.
- **Décision :** lorsqu'un widget est réduit en hauteur, les widgets que son
  ancien encombrement avait repoussés sous lui remontent automatiquement. La
  compaction conserve leur colonne, ne dépasse pas le nombre de lignes libérées
  et refuse tout chevauchement; elle s'applique au moteur partagé des pages Grid
  et de la portée Appareils d'Aperçu.
- **Pourquoi :** l'agrandissement invalide la carte de positions et déclenche un
  repack, alors que la réduction laisse cette carte valide avec des trous. Une
  compaction bornée restaure l'espace libéré sans effacer les placements manuels
  ailleurs dans la grille.
- **Conséquence :** `widget-resize-coordinator.js` déclenche la compaction à la
  fin du geste uniquement si la hauteur a diminué;
  `compactWidgetPositionsAfterHeightShrink()` dans
  `placement-calculations.js` calcule et persiste la nouvelle carte avant le
  remplacement final du widget.

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

### 2026-07-29 — Choisir la source de fond des pages Météo, Grid et Aperçu

- **Statut :** confirmé.
- **Décision :** le sous-panneau global « Fond d’écran » expose un toggle
  « Utiliser le fond d’écran météo ». Son état est persisté sous
  `mha_grid_wallpaper`; lorsqu’il est actif, toutes les pages `grid` et
  `overview` réutilisent le paysage configuré pour la page Météo, avec
  `alpine-lake` comme repli. Chaque page Météo expose séparément dans son
  panneau un toggle « Utiliser le fond d’écran du thème », persisté dans sa
  configuration sous `useThemeBackground`. Il vaut `false` par défaut; activé,
  il masque seulement la scène météo de cette page et révèle le fond du thème
  actif, sans effacer son `weatherLandscapeId`. Les pages Média conservent leur
  artwork dédié.
- **Pourquoi :** les paysages météo sont des sources de fond MHA réutilisables,
  pas une implémentation propre au layout de la page Météo. Une préférence
  globale reste cohérente avec le panneau de fond d’écran existant et évite de
  dupliquer les assets, les effets ou leur moteur de rendu. Le réglage local
  permet à la page Météo de suivre visuellement le thème sans détourner le
  toggle global destiné à Grid et Aperçu.
- **Conséquence :** le panneau de la page Météo possède le choix du paysage et
  de sa propre source de fond; le panneau global décide seulement si Grid et
  Aperçu réutilisent ce paysage. Le pipeline conserve l’identité de page Météo
  même lorsque sa scène est désactivée, afin que seul le fond change. Réactiver
  le fond météo restaure immédiatement le paysage précédemment sélectionné.

## Pièges connus

- Dans `overview-page-controller.js`, les fonctions de timer injectées doivent
  être enveloppées avant d'être stockées sur le contrôleur. Appeler directement
  un `setTimeout` global comme une méthode du contrôleur peut interrompre
  `selectArea()` avant sa notification : l'identifiant est alors modifié en
  mémoire, mais la section Appareils reste sur son placeholder jusqu'à un autre
  rendu, notamment l'entrée en édition.
- Les sheets et popups globaux ne doivent pas être montés sous une
  `.mha-page-panel`. Ce panneau porte un `transform` pour les transitions et
  devient donc le containing block de ses descendants `position: fixed`; une
  surface qui y reste imbriquée est limitée au rectangle rembourré de
  `.mha-widget-area`. Comme les autres surfaces MHA, les overlays appartenant à
  une page doivent conserver `createPanelShell()` et
  `applyPanelSurfaceContract()`, mais être portalisés directement sous le
  `shadowRoot`, avec destruction explicite lors du rerender et de la fermeture.
- Après l'ajout ou le retrait d'une surface portalisée, recalculer
  `is-widget-surface-open` avec `syncWidgetSurfaceOpenState()`. Avec des surfaces
  imbriquées, fermer la popup enfant conserve légitimement le flou tant que la
  sheet parente reste ouverte; si le retrait de cette dernière ne resynchronise
  pas l'hôte, le filtre demeure appliqué alors qu'aucune surface n'est encore
  présente.
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
- Le contrôle détaillé des entités `light` s’ouvre uniquement depuis la zone
  informative des widgets `toggle` et `toggle-slider`; leurs toggles, sliders et
  outils d’édition gardent leurs interactions directes. Il repose sur le contrat
  de surface existant (`page-creator` en popup et sheet mobile), dont l’en-tête
  conserve le swipe descendant de fermeture. Le contenu est séparé en vues
  contrôle, couleur personnalisée et configuration. En portrait mobile, les
  deux sections principales se parcourent par scroll vertical paginé; en
  paysage, tablette et desktop elles restent côte à côte sans scroll global.
  Les préréglages persistants appartiennent à `widget.lightPopup` et sont
  normalisés par le registry du widget; les appels HA restent centralisés dans
  l’adaptateur lumière et les sliders utilisent l’action coalescée existante.
