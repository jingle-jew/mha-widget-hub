/*
 * MHA reusable pill component.
 */

export function createPill({
  label = "",
  tone = "default",
  className = "",
} = {}) {
  const pill = document.createElement("span");
  pill.className = ["mha-pill", className].filter(Boolean).join(" ");
  pill.dataset.tone = tone;
  pill.textContent = label;
  return pill;
}
