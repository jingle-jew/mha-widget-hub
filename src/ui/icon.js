/*
 * MHA Icon component foundation.
 *
 * Scope:
 * - create a reusable icon container component;
 * - no glyph/sign rendering yet;
 * - no dock/widget/status-bar integration yet.
 */

export function createIcon({
  name = "",
  category = "",
  label = "",
  className = "",
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

  return icon;
}
