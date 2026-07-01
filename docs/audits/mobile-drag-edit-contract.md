# MHA Drag/Edit Contract

This note freezes the current interaction contract for widget edit mode and
drag/drop so future fixes do not accidentally change gesture ownership.

## Core Drag/Edit Contract

- `read`: no widget drag, no drop slots, no move target.
- `edit-idle`: edit chrome is visible and a widget may enter `drag-pending`.
- `drag-pending`: a valid pointerdown started on a widget; long press may arm
  drag; movement beyond tolerance cancels the pending session.
- `drag-armed`: `_activeMoveWidgetId` is the single source of truth; visible
  drop slots belong only to that widget; drag wins over concurrent
  interactions.
- `resizing`: resize blocks drag start and clears incompatible drag state.

`tablet` and `desktop` share this core contract and must keep reliable drag and
drop without mobile-specific gesture changes.

## Mobile Scroll Addendum

- `mobile` is the only layout where page scroll directly competes with widget
  drag gestures.
- Short term product decision: drag reliability wins over scrolling directly on
  widgets while edit mode is active.
- Accepted workflow: the user scrolls first, then enters edit mode, then moves
  or edits widgets.

Any future change to `touch-action` or drag start surfaces must be treated as a
contract change, not as an isolated CSS tweak.
