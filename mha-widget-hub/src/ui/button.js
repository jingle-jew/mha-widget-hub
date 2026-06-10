/*
 * MHA reusable button component.
 */

export function createButton({
  label = "",
  variant = "default",
  size = "default",
  pressed = false,
  className = "",
  onClick,
} = {}) {
  const button = document.createElement("button");
  button.className = ["mha-button", className].filter(Boolean).join(" ");
  button.type = "button";
  button.dataset.variant = variant;
  button.dataset.size = size;
  button.setAttribute("aria-pressed", String(Boolean(pressed)));
  button.textContent = label;

  if (onClick) button.addEventListener("click", onClick);

  return button;
}
