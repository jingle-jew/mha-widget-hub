import { createSystemIconSymbol, getSystemIconName } from "./system-icons.js";
import { t } from "../i18n/index.js";

const SYSTEM_ICON_META = Object.freeze({
  back: { icon: "back", label: "Back", labelKey: "common.back" },
  close: { icon: "close", label: "Close", labelKey: "common.close" },
  up: { icon: "up", label: "Move up" },
  down: { icon: "down", label: "Move down" },
  delete: { icon: "delete", label: "Delete", labelKey: "common.delete" },
  add: { icon: "add", label: "Add", labelKey: "common.add" },
  edit: { icon: "edit", label: "Edit", labelKey: "common.edit" },
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
    label: label || (meta.labelKey ? t(meta.labelKey, meta.label) : meta.label),
    className: [`mha-system-button--${kind}`, className].filter(Boolean).join(" "),
    ...rest,
  });
}

export const createBackButton = (options = {}) => systemButton("back", options);
export const createCloseButton = (options = {}) => systemButton("close", { variant: "danger", ...options });
export const createMoveUpButton = (options = {}) => systemButton("up", { size: "sm", ...options });
export const createMoveDownButton = (options = {}) => systemButton("down", { size: "sm", ...options });
export const createDeleteButton = (options = {}) => systemButton("delete", { size: "sm", variant: "danger", ...options });
export const createRemoveButton = (options = {}) => createSystemIconButton({ icon: "close", label: t("common.delete", "Delete"), size: "sm", variant: "danger", className: "mha-system-button--remove", ...options });
export const createAddButton = (options = {}) => systemButton("add", options);
export const createEditButton = (options = {}) => systemButton("edit", options);
