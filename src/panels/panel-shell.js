import { createCloseButton } from "../system/system-buttons.js";
import { t } from "../i18n/index.js";

function appendChildren(parent, children = []) {
  children.filter(Boolean).forEach((child) => parent.append(child));
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
  scrim.setAttribute("aria-label", closeLabel);
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
  return panel;
}
