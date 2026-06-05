/*
 * MHA reusable slider component.
 */

export function createSlider({
  label = "",
  min = 0,
  max = 100,
  value = 50,
  className = "",
  onInput,
} = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = ["mha-slider", className].filter(Boolean).join(" ");

  if (label) {
    const text = document.createElement("span");
    text.className = "mha-slider-label";
    text.textContent = label;
    wrapper.append(text);
  }

  const input = document.createElement("input");
  input.className = "mha-slider-input";
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.setAttribute("aria-label", label || "Slider");
  input.style.setProperty("--mha-slider-value", `${((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100}%`);

  input.addEventListener("input", (event) => {
    const current = Number(event.currentTarget.value);
    const percent = ((current - Number(min)) / (Number(max) - Number(min))) * 100;
    event.currentTarget.style.setProperty("--mha-slider-value", `${percent}%`);
    onInput?.(event);
  });

  wrapper.append(input);
  return wrapper;
}
