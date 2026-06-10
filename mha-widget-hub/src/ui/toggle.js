/*
 * MHA reusable toggle component.
 */

export function createToggle({
  label = "",
  checked = false,
  className = "",
  onChange,
} = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = ["mha-toggle", className].filter(Boolean).join(" ");

  const input = document.createElement("input");
  input.className = "mha-toggle-input";
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.setAttribute("aria-label", label || "Toggle");

  const track = document.createElement("span");
  track.className = "mha-toggle-track";

  const thumb = document.createElement("span");
  thumb.className = "mha-toggle-thumb";

  track.append(thumb);
  wrapper.append(input, track);

  if (onChange) input.addEventListener("change", onChange);

  return wrapper;
}
