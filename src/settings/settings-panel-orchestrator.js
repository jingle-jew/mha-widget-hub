const SETTINGS_PANEL_EXIT_ANIMATION_MS = 1100;
const SETTINGS_PANEL_EXIT_TIMEOUT = "__mhaSettingsPanelExitTimeout";
const SETTINGS_PANEL_OPEN_FRAME = "__mhaSettingsPanelOpenFrame";

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

function hasOpenState(panel) {
  return panel?.dataset && Object.prototype.hasOwnProperty.call(panel.dataset, "open");
}

function isPanelOpen(panel) {
  return panel?.dataset?.open === "true";
}

function setSettingsPanelOpenState(panel, open) {
  if (!panel || !hasOpenState(panel)) return;
  panel.dataset.open = String(open);
  panel.setAttribute?.("aria-hidden", String(!open));
  if (open) panel.hidden = false;
}

function clearSettingsPanelAnimationHandles(panel) {
  if (!panel) return;
  if (panel[SETTINGS_PANEL_EXIT_TIMEOUT]) {
    clearTimeout(panel[SETTINGS_PANEL_EXIT_TIMEOUT]);
    panel[SETTINGS_PANEL_EXIT_TIMEOUT] = null;
  }
  if (panel[SETTINGS_PANEL_OPEN_FRAME]) {
    cancelAnimationFrame(panel[SETTINGS_PANEL_OPEN_FRAME]);
    panel[SETTINGS_PANEL_OPEN_FRAME] = null;
  }
}

function scheduleSettingsPanelOpen(panel) {
  if (!panel || !hasOpenState(panel)) return;
  panel.hidden = false;
  if (typeof requestAnimationFrame !== "function") {
    setSettingsPanelOpenState(panel, true);
    return;
  }
  panel[SETTINGS_PANEL_OPEN_FRAME] = requestAnimationFrame(() => {
    panel[SETTINGS_PANEL_OPEN_FRAME] = requestAnimationFrame(() => {
      panel[SETTINGS_PANEL_OPEN_FRAME] = null;
      setSettingsPanelOpenState(panel, true);
    });
  });
}

function scheduleSettingsPanelClose(panel) {
  if (!panel || !hasOpenState(panel)) return;
  clearSettingsPanelAnimationHandles(panel);
  panel.hidden = false;
  setSettingsPanelOpenState(panel, false);
  panel[SETTINGS_PANEL_EXIT_TIMEOUT] = setTimeout(() => {
    panel[SETTINGS_PANEL_EXIT_TIMEOUT] = null;
    panel.hidden = true;
  }, SETTINGS_PANEL_EXIT_ANIMATION_MS);
}

function animateSettingsPanelUpdate(panel, wasOpen, nextOpen) {
  if (!panel || !hasOpenState(panel)) return;
  clearSettingsPanelAnimationHandles(panel);
  if (!wasOpen && nextOpen) {
    setSettingsPanelOpenState(panel, false);
    scheduleSettingsPanelOpen(panel);
    return;
  }
  if (wasOpen && !nextOpen) {
    scheduleSettingsPanelClose(panel);
  }
}

function prepareSettingsPanelEntry(panel) {
  if (!panel || !isPanelOpen(panel)) return;
  setSettingsPanelOpenState(panel, false);
  panel.hidden = false;
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
  const wasOpen = isPanelOpen(existing);
  const nextOpen = isPanelOpen(next);

  if (sameView && updatePanel(existing, next)) {
    animateSettingsPanelUpdate(existing, wasOpen, nextOpen);
    return existing;
  }

  const shouldAnimateEntry = nextOpen;
  if (shouldAnimateEntry) prepareSettingsPanelEntry(next);

  if (existing) existing.replaceWith(next);
  else root?.append(next);

  const body = next?.querySelector(".mha-settings-body");
  if (body) body.scrollTop = scrollTop;
  if (shouldAnimateEntry) scheduleSettingsPanelOpen(next);
  if (!next?.hidden) findPanelFocusTarget(next, focusIdentity)?.focus?.({ preventScroll: true });
  return next;
}
