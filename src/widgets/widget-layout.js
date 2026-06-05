/*
 * MHA Widget Layout helpers.
 *
 * These helpers provide a small declarative API for placing reusable UI
 * components inside a widget's internal grid.
 */

function normalizeGridNumber(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.round(number));
}


function normalizeChildren(children = []) {
  if (children === null || children === undefined) return [];
  return Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
}

export function createWidgetInnerGrid({ className = "", ariaHidden = true } = {}) {
  const grid = document.createElement("div");
  grid.className = ["mha-widget-inner-grid", className].filter(Boolean).join(" ");

  if (ariaHidden) {
    grid.setAttribute("aria-hidden", "true");
  }

  return grid;
}

export function createWidgetUnit({
  col = 1,
  row = 1,
  colSpan = 1,
  rowSpan = 1,
  area = "",
  className = "",
  align = "center",
  justify = "center",
  children = [],
} = {}) {
  const unit = document.createElement("div");

  unit.className = ["mha-widget-unit", className].filter(Boolean).join(" ");
  unit.dataset.col = String(normalizeGridNumber(col));
  unit.dataset.row = String(normalizeGridNumber(row));
  unit.dataset.colSpan = String(normalizeGridNumber(colSpan));
  unit.dataset.rowSpan = String(normalizeGridNumber(rowSpan));

  if (area) unit.dataset.area = area;
  if (align) unit.dataset.align = align;
  if (justify) unit.dataset.justify = justify;

  unit.style.setProperty("--mha-widget-unit-col", unit.dataset.col);
  unit.style.setProperty("--mha-widget-unit-row", unit.dataset.row);
  unit.style.setProperty("--mha-widget-unit-col-span", unit.dataset.colSpan);
  unit.style.setProperty("--mha-widget-unit-row-span", unit.dataset.rowSpan);

  unit.append(...normalizeChildren(children));

  return unit;
}

/*
 * Slider placement rule.
 *
 * Sliders are never allowed to occupy less than 2 internal widget units along
 * their active axis:
 *
 * - horizontal slider without an embedded label: minimum 2 columns wide;
 * - horizontal slider with an embedded label: minimum 3 columns wide;
 * - vertical slider: minimum 2 rows tall.
 *
 * There is no max span here: full SliderWidget layout owns larger 4x1,
 * 1x4, 6x1, and 1x6 use cases.
 *
 * This keeps embedded slider controls usable while avoiding an artificial cap.
 */
export function createWidgetSliderUnit({
  orientation = "horizontal",
  hasLabel = true,
  colSpan = 1,
  rowSpan = 1,
  className = "",
  children = [],
  ...rest
} = {}) {
  const resolvedOrientation = orientation === "vertical" || orientation === "auto" ? orientation : "horizontal";
  const minHorizontalSpan = hasLabel ? 3 : 2;

  const resolvedColSpan = resolvedOrientation === "horizontal"
    ? Math.max(minHorizontalSpan, normalizeGridNumber(colSpan))
    : normalizeGridNumber(colSpan);

  const resolvedRowSpan = resolvedOrientation === "vertical"
    ? Math.max(2, normalizeGridNumber(rowSpan))
    : normalizeGridNumber(rowSpan);

  const unit = createWidgetUnit({
    ...rest,
    colSpan: resolvedColSpan,
    rowSpan: resolvedRowSpan,
    justify: rest.justify || "stretch",
    align: rest.align || "stretch",
    className: [
      "mha-widget-slider-unit",
      `mha-widget-slider-unit--${resolvedOrientation}`,
      hasLabel ? "mha-widget-slider-unit--has-label" : "mha-widget-slider-unit--no-label",
      className,
    ].filter(Boolean).join(" "),
    children,
  });

  unit.dataset.orientationMode = resolvedOrientation;

  return unit;
}

export function createWidgetText({
  text = "",
  as = "span",
  className = "",
  tone = "default",
} = {}) {
  const element = document.createElement(as);
  element.className = ["mha-widget-text", className].filter(Boolean).join(" ");
  element.dataset.tone = tone;
  element.textContent = text;
  return element;
}
