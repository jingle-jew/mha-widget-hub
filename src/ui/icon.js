/*
 * MHA Icon component foundation.
 *
 * Scope:
 * - create a reusable icon container component;
 * - shape/container only;
 * - signs/symbols are separate children, usually from createIconSymbol().
 */

export function createIcon({
  name = "",
  category = "",
  label = "",
  className = "",
  children = [],
} = {}) {
  const icon = document.createElement("span");

  icon.className = ["mha-icon", className].filter(Boolean).join(" ");

  if (name) icon.dataset.icon = name;
  if (category) icon.dataset.iconCategory = category;

  if (label) {
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", label);
  } else {
    icon.setAttribute("aria-hidden", "true");
  }

  const normalizedChildren = Array.isArray(children) ? children : [children];
  icon.append(...normalizedChildren.filter(Boolean));

  return icon;
}
