import { createCloseButton } from "../system/system-buttons.js";
import { t } from "../i18n/index.js";

function appendChildren(parent, children = []) {
  children.filter(Boolean).forEach((child) => parent.append(child));
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.("button, input, select, textarea, a, [role='button'], [data-settings-control]"));
}

function isMobileSheetPanel(panel) {
  const hostLayout = panel?.getRootNode?.()?.host?.dataset?.layout || "";
  return panel?.dataset?.mobilePresentation === "sheet"
    && (panel?.dataset?.mobileLayout === "true" || hostLayout === "mobile");
}

function bindMobileSheetSwipeToClose({ panel, sheet, scrim, onClose }) {
  if (!panel || !sheet || !scrim) return;

  const headerSelector = ".mha-settings-header, .mha-page-creator-header";
  let activePointerId = null;
  let activeHeader = null;
  let startX = 0;
  let startY = 0;
  let offsetY = 0;
  let dragging = false;

  function resetSwipeStyles() {
    panel.dataset.swipeClosing = "false";
    sheet.style.transition = "";
    sheet.style.transform = "";
    scrim.style.transition = "";
    scrim.style.opacity = "";
    scrim.style.pointerEvents = "";
  }

  function clearGestureState() {
    activePointerId = null;
    activeHeader = null;
    startX = 0;
    startY = 0;
    offsetY = 0;
    dragging = false;
  }

  function applySwipeOffset(nextOffsetY = 0) {
    const height = Math.max(sheet.getBoundingClientRect?.().height || 0, 1);
    const progress = Math.max(0, Math.min(1, nextOffsetY / Math.max(96, height * 0.35)));
    panel.dataset.swipeClosing = "true";
    sheet.style.transition = "none";
    scrim.style.transition = "none";
    sheet.style.transform = `translateY(${nextOffsetY}px)`;
    scrim.style.opacity = String(Math.max(0, 1 - progress));
    scrim.style.pointerEvents = "auto";
  }

  function finishGesture(event) {
    if (event?.pointerId !== activePointerId) return;

    const releasePointerId = activePointerId;
    const header = activeHeader;
    const wasDragging = dragging;
    const shouldClose = wasDragging && offsetY >= Math.max(72, (sheet.getBoundingClientRect?.().height || 0) * 0.18);

    clearGestureState();
    header?.releasePointerCapture?.(releasePointerId);
    resetSwipeStyles();

    if (shouldClose) onClose?.();
    if (wasDragging) event?.preventDefault?.();
  }

  panel.addEventListener("pointerdown", (event) => {
    if (!isMobileSheetPanel(panel) || panel.dataset.open !== "true" || panel.hidden) return;
    if (event.pointerType === "mouse" || (event.button != null && event.button !== 0)) return;
    if (isInteractiveTarget(event.target)) return;

    const header = event.target?.closest?.(headerSelector);
    if (!header || header.closest?.("[role='dialog']") !== sheet) return;

    activePointerId = event.pointerId;
    activeHeader = header;
    startX = event.clientX || 0;
    startY = event.clientY || 0;
    offsetY = 0;
    dragging = false;
    activeHeader.setPointerCapture?.(activePointerId);
  });

  panel.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;

    const deltaX = (event.clientX || 0) - startX;
    const deltaY = (event.clientY || 0) - startY;
    if (deltaY <= 0) return;

    if (!dragging) {
      if (Math.abs(deltaY) < 10) return;
      if (Math.abs(deltaY) <= Math.abs(deltaX)) return;
      dragging = true;
    }

    offsetY = Math.max(0, deltaY);
    applySwipeOffset(offsetY);
    event.preventDefault?.();
  });

  panel.addEventListener("pointerup", finishGesture);
  panel.addEventListener("pointercancel", finishGesture);
}

export function createPanelShell({
  open = false,
  rootClassName = "mha-panel-shell",
  scrimClassName = "mha-panel-shell-scrim",
  sheetClassName = "mha-panel-shell-sheet",
  headerClassName = "mha-panel-shell-header",
  closeClassName = "mha-panel-shell-close",
  titleClassName = "",
  title = "",
  ariaLabel = title,
  closeLabel = t("common.close", "Close"),
  scrimLabel = closeLabel,
  onClose = () => {},
  children = [],
} = {}) {
  const panel = document.createElement("section");
  panel.className = rootClassName;
  panel.dataset.open = String(Boolean(open));
  panel.setAttribute("aria-hidden", String(!open));

  const scrim = document.createElement("button");
  scrim.className = scrimClassName;
  scrim.type = "button";
  scrim.setAttribute("aria-label", scrimLabel);
  scrim.onclick = onClose;

  const sheet = document.createElement("div");
  sheet.className = sheetClassName;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  if (ariaLabel) sheet.setAttribute("aria-label", ariaLabel);

  const header = document.createElement("div");
  header.className = headerClassName;
  const heading = document.createElement("h2");
  if (titleClassName) heading.className = titleClassName;
  heading.textContent = title;
  const close = createCloseButton({
    label: closeLabel,
    className: closeClassName,
    onClick: onClose,
  });
  header.append(heading, close);

  sheet.append(header);
  appendChildren(sheet, children);
  panel.append(scrim, sheet);
  bindMobileSheetSwipeToClose({ panel, sheet, scrim, onClose });
  return panel;
}
