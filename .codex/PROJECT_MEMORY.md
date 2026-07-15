# Mémoire persistante — MHA Widget Hub

Dernière consolidation : 2026-07-14

Ce fichier contient les connaissances durables qui seraient coûteuses à redécouvrir.
Le code et les tests actuels restent la source de vérité. Les instructions de travail
appartiennent à `AGENTS.md`.

## Architecture et frontières

- La mémoire persistante est chargée au début de chaque tâche par `AGENTS.md`.
- `$refresh-project-memory` consolide les apprentissages ; il ne produit pas un journal exhaustif.
- Les observations encore incertaines restent dans `.codex/LEARNING_INBOX.md` jusqu’à
  confirmation ou rejet.

## Décisions et raisons

### 2026-07-14 — Séparer instructions et connaissances

- **Statut :** confirmé.
- **Décision :** conserver les règles impératives dans `AGENTS.md` et les connaissances
  historiques dans ce fichier.
- **Pourquoi :** les instructions doivent rester courtes et stables, tandis que la
  mémoire doit pouvoir évoluer, être corrigée et conserver le raisonnement architectural.
- **Conséquence :** une nouvelle règle de comportement ne doit pas être ajoutée ici ; une
  décision ou un piège de projet ne doit pas gonfler inutilement `AGENTS.md`.

## Invariants et contraintes

- Une connaissance mémorisée ne doit jamais remplacer la vérification du code actuel.
- Une information issue d’une seule observation incertaine ne devient pas un invariant.

## Pièges connus

- Dans `semantic-tokens.css`, ne pas redéfinir le `--mha-primary-surface`
  spécialisé de OneUI avec `var(--mha-surface-primary)` : OneUI mappe déjà
  `--mha-surface-primary` vers `--mha-primary-surface`. La double référence
  forme un cycle de custom properties, invalide la surface calculée et fait
  retomber les widgets sur leurs anciens fallbacks visuels.

## Préférences UX et produit

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
- Les surfaces du dock OneUI, standard comme compactes, sont légèrement
  translucides, floutées et teintées par la couleur d’accent active du thème.
  La pastille de l’élément actif reprend cette teinte avec une intensité plus
  forte pour préserver la hiérarchie de sélection.
- Le verre OneUI utilise un grain volontairement visible mais fin et poudreux :
  texture fractale dense à quatre octaves, répétée à `56px`, opacité `.14` et
  fusion `soft-light`. Ce voile couvre aussi les sheets/panels OneUI sans leur
  ajouter de bordure ou d’ombre.
- Le canvas généré de OneUI clair reste légèrement assombri par ses couleurs de
  base, sans réduire l’intensité des blobs, afin que les surfaces primary
  laiteuses conservent un contraste lisible avec le fond.
- Le screensaver OneUI floute le véritable wallpaper dans les deux modes. Le
  reset `filter: none` du canvas clair ne s’applique que lorsque le screensaver
  est masqué, afin de ne pas neutraliser son blur commun de `18px`.
- `primary-surface` OneUI reproduit le matériau fortement diffusé de One UI
  Home : clair froid et laiteux, sombre bleu nuit très absorbant, blur `46px`
  et saturation `118%`. Sa couleur et celle du dock OneUI latéral/compact
  partagent les mêmes tokens de stops; la surface primary les compose à `88%`
  pour rester légèrement plus transparente que le dock sans atténuer son
  contenu. Son blur et sa brightness restent propres au rôle primary. Les rôles
  panel et `on-primary` restent indépendants tant qu’ils ne sont pas
  explicitement remappés.
- En OneUI, la section « Lecteurs disponibles » de la page Média réutilise la
  matière du dock et son lecteur sélectionné réutilise exactement la surface de
  la pastille active du dock.
- En OneUI sombre seulement, les contours et ombres externes des panels, sheets
  et popups sont neutralisés afin d’éviter un rendu tridimensionnel. La
  profondeur vient des surfaces internes; le calibrage OneUI clair reste
  inchangé.
- Sur la page Média mobile, le dock reste masqué pendant toute l’ouverture de la
  sheet « Lecteurs disponibles »; son empreinte structurelle est conservée pour
  éviter un reflow.

## Approches remplacées ou rejetées

- Relire la mémoire avant chaque message a été écarté : elle reste déjà dans le contexte
  de la tâche. La relecture est réservée aux changements, compactages et incertitudes.
- Accumuler automatiquement tous les événements de la journée a été écarté : cela crée
  du bruit, des contradictions et des règles trop spécifiques.
