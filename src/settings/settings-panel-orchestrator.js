import { SETTINGS_PANEL_VISIBILITY_TRANSITION_MS } from "../panels/panel-transition-timing.js";

export function getPanelFocusIdentity(root, panel) {
  const active = root?.activeElement;
  if (!active || !panel?.contains(active)) return null;
  return {
    tagName: active.tagName,
    settingsControl: active.dataset?.settingsControl || "",
    ariaLabel: active.getAttribute?.("aria-label") || "",
    name: active.getAttribute?.("name") || "",
    type: active.getAttribute?.("type") || "",
  };
}

export function captureSettingsPanelsUiState(root) {
  const panels = [...root?.querySelectorAll?.(".mha-settings-panel") || []];
  return panels.map((panel) => ({
    scope: panel?.dataset?.settingsScope || "",
    page: panel?.dataset?.settingsPage || "",
    scrollTop: panel?.querySelector?.(".mha-settings-body")?.scrollTop || 0,
  }));
}

export function restoreSettingsPanelsUiState(root, panelStates = []) {
  const states = Array.isArray(panelStates) ? panelStates : [];
  states.forEach((state) => {
    const panel = [...root?.querySelectorAll?.(".mha-settings-panel") || []]
      .find(candidate => (
        candidate?.dataset?.settingsScope === state.scope
        && candidate?.dataset?.settingsPage === state.page
      ));
    if (!panel || panel?.dataset?.settingsPage !== state.page) return;
    const body = panel.querySelector?.(".mha-settings-body");
    if (body) body.scrollTop = state.scrollTop || 0;
  });
}

export function findPanelFocusTarget(panel, identity) {
  if (!panel || !identity) return null;
  const candidates = [...panel.querySelectorAll(identity.tagName.toLowerCase())];
  return candidates.find((candidate) => {
    if (identity.settingsControl) return candidate.dataset?.settingsControl === identity.settingsControl;
    if (identity.ariaLabel) return candidate.getAttribute("aria-label") === identity.ariaLabel;
    if (identity.name) {
      return candidate.getAttribute("name") === identity.name
        && candidate.getAttribute("type") === identity.type;
    }
    return false;
  }) || null;
}

const SETTINGS_PANEL_SWAP_TRANSITION_MS = SETTINGS_PANEL_VISIBILITY_TRANSITION_MS;
const SETTINGS_SHARED_SWAP_SCRIM_SELECTOR = ".mha-settings-shared-scrim";

function ensureSharedSwapScrim(root, panel) {
  const existingScrim = root?.querySelector?.(SETTINGS_SHARED_SWAP_SCRIM_SELECTOR);
  if (existingScrim) {
    existingScrim.dataset.active = "true";
    return existingScrim;
  }

  const documentRef = panel?.ownerDocument || globalThis.document;
  const scrim = documentRef?.createElement?.("div");
  if (!scrim) return null;
  scrim.className = "mha-settings-shared-scrim";
  scrim.dataset.active = "true";
  scrim.setAttribute?.("aria-hidden", "true");
  root?.append?.(scrim);
  return scrim;
}

function animateSettingsPanelSwap({
  root,
  existing,
  next,
  focusIdentity = null,
} = {}) {
  if (!root || !existing || !next || typeof root.append !== "function" || typeof existing.remove !== "function") {
    existing?.replaceWith?.(next);
    return next;
  }

  existing.dataset.panelSwapState = "leaving";
  next.hidden = false;
  next.dataset.open = "true";
  next.setAttribute?.("aria-hidden", "false");
  next.dataset.panelSwapState = "entering";

  const sharedSwapScrim = ensureSharedSwapScrim(root, existing);
  const swapToken = Symbol("mha-settings-swap");
  root._mhaSettingsSwapToken = swapToken;

  root.append(next);

  globalThis.setTimeout(() => {
    existing.remove();
    delete next.dataset.panelSwapState;
    if (root?._mhaSettingsSwapToken === swapToken) {
      delete root._mhaSettingsSwapToken;
      sharedSwapScrim?.remove?.();
    }
    findPanelFocusTarget(next, focusIdentity)?.focus?.({ preventScroll: true });
  }, SETTINGS_PANEL_SWAP_TRANSITION_MS);

  return next;
}

export function replaceSettingsPanelPreservingUiState({
  root,
  existing,
  next,
  updatePanel = () => false,
} = {}) {
  const sameView = existing?.dataset.settingsScope === next?.dataset.settingsScope
    && existing?.dataset.settingsPage === next?.dataset.settingsPage;
  const scrollTop = sameView
    ? existing?.querySelector(".mha-settings-body")?.scrollTop || 0
    : 0;
  const focusIdentity = sameView ? getPanelFocusIdentity(root, existing) : null;

  if (sameView && updatePanel(existing, next)) return existing;
  if (
    existing
    && !sameView
    && existing?.dataset?.settingsScope === next?.dataset?.settingsScope
    && existing?.hidden === false
    && next?.dataset?.open === "true"
  ) {
    const body = next?.querySelector?.(".mha-settings-body");
    if (body) body.scrollTop = 0;
    return animateSettingsPanelSwap({ root, existing, next, focusIdentity });
  }

  if (existing) existing.replaceWith(next);
  else root?.append(next);

  const body = next?.querySelector(".mha-settings-body");
  if (body) body.scrollTop = scrollTop;
  if (!next?.hidden) findPanelFocusTarget(next, focusIdentity)?.focus?.({ preventScroll: true });
  return next;
}
