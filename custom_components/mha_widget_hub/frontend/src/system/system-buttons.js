import { createSystemIconSymbol, getSystemIconName } from "./system-icons.js";

const SYSTEM_ICON_META = Object.freeze({
  back: { icon: "back", label: "Retour" },
  close: { icon: "close", label: "Fermer" },
  up: { icon: "up", label: "Monter" },
  down: { icon: "down", label: "Descendre" },
  delete: { icon: "delete", label: "Supprimer" },
  add: { icon: "add", label: "Ajouter" },
  edit: { icon: "edit", label: "Modifier" },
});

export function createSystemIconButton({
  icon = "add",
  label = "Action",
  variant = "ghost",
  size = "md",
  className = "",
  disabled = false,
  onClick,
} = {}) {
  const systemIconName = getSystemIconName(icon);
  const button = document.createElement("button");
  button.className = [
    "mha-system-button",
    `mha-system-button--${variant}`,
    `mha-system-button--${size}`,
    className,
  ].filter(Boolean).join(" ");
  button.type = "button";
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-label", label);
  if (onClick) button.addEventListener("click", onClick);

  const iconElement = document.createElement("span");
  iconElement.className = "mha-system-icon";
  iconElement.dataset.systemIcon = systemIconName;
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.append(createSystemIconSymbol({ name: systemIconName }));
  button.append(iconElement);

  return button;
}

function systemButton(kind, { label, className = "", ...rest } = {}) {
  const meta = SYSTEM_ICON_META[kind] || SYSTEM_ICON_META.add;
  return createSystemIconButton({
    icon: meta.icon,
    label: label || meta.label,
    className: [`mha-system-button--${kind}`, className].filter(Boolean).join(" "),
    ...rest,
  });
}

export const createBackButton = (options = {}) => systemButton("back", options);
export const createCloseButton = (options = {}) => systemButton("close", { variant: "danger", ...options });
export const createMoveUpButton = (options = {}) => systemButton("up", { size: "sm", ...options });
export const createMoveDownButton = (options = {}) => systemButton("down", { size: "sm", ...options });
export const createDeleteButton = (options = {}) => systemButton("delete", { size: "sm", variant: "danger", ...options });
export const createRemoveButton = (options = {}) => createSystemIconButton({ icon: "close", label: "Supprimer", size: "sm", variant: "danger", className: "mha-system-button--remove", ...options });
export const createAddButton = (options = {}) => systemButton("add", options);
export const createEditButton = (options = {}) => systemButton("edit", options);
