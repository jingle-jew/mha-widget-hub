import { createIcon } from "./icon.js";
import { createIconSymbol } from "./icon-symbol.js";

const SYSTEM_ICON_META = Object.freeze({
  back: { name: "arrow-left", label: "Retour" },
  close: { name: "close", label: "Fermer" },
  up: { name: "arrow-up", label: "Monter" },
  down: { name: "arrow-down", label: "Descendre" },
  delete: { name: "trash", label: "Supprimer" },
  add: { name: "plus", label: "Ajouter" },
  edit: { name: "edit", label: "Modifier" },
});

export function createSystemIconButton({
  icon = "plus",
  label = "Action",
  variant = "ghost",
  size = "md",
  className = "",
  disabled = false,
  onClick,
} = {}) {
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

  button.append(createIcon({
    name: icon,
    category: "utility",
    label,
    children: createIconSymbol({ name: icon, label }),
  }));

  return button;
}

function systemButton(kind, { label, className = "", ...rest } = {}) {
  const meta = SYSTEM_ICON_META[kind] || SYSTEM_ICON_META.add;
  return createSystemIconButton({
    icon: meta.name,
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
