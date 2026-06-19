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
  if (existing) existing.replaceWith(next);
  else root?.append(next);

  const body = next?.querySelector(".mha-settings-body");
  if (body) body.scrollTop = scrollTop;
  if (!next?.hidden) findPanelFocusTarget(next, focusIdentity)?.focus?.({ preventScroll: true });
  return next;
}
