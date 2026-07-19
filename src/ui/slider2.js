/*
 * Compact iOS slider surface.
 *
 * slider2 delegates value, pointer, keyboard, disabled state and callbacks to
 * createSlider. It only adds the denser visual layers used in composed widgets.
 */

import { createSlider } from "./slider.js";

export function createSlider2({
  className = "",
  ...sliderOptions
} = {}) {
  const slider = createSlider({
    ...sliderOptions,
    className: ["slider2", "slider2--ios", "slider2--compact", className]
      .filter(Boolean)
      .join(" "),
  });

  const surface = document.createElement("span");
  surface.className = "slider2__surface";
  surface.setAttribute("aria-hidden", "true");

  const fill = document.createElement("span");
  fill.className = "slider2__fill";

  const sheen = document.createElement("span");
  sheen.className = "slider2__sheen";

  const thumb = document.createElement("span");
  thumb.className = "slider2__thumb";

  surface.append(fill, sheen, thumb);
  slider.prepend(surface);

  return slider;
}
