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


/*
 * Internal Widget Grid System
 *
 * This is the shared content grammar for widgets.
 *
 * The outer dashboard grid decides where a widget lives and how large it is.
 * The internal widget grid decides where common content regions live inside the
 * widget itself: header, hero, body, meta, secondary, footer.
 *
 * Widgets may still use fully custom markup, but new widgets should prefer this
 * system so their internal rhythm stays coherent.
 */
export const WIDGET_INNER_LAYOUTS = Object.freeze([
  "compact",
  "wide",
  "split",
  "stack",
  "hero",
  "custom",
]);

export const WIDGET_INNER_DENSITIES = Object.freeze([
  "comfortable",
  "normal",
  "dense",
]);

export function normalizeWidgetInnerLayout(layout = "compact") {
  return WIDGET_INNER_LAYOUTS.includes(layout) ? layout : "compact";
}

export function normalizeWidgetInnerDensity(density = "normal") {
  return WIDGET_INNER_DENSITIES.includes(density) ? density : "normal";
}

export function createWidgetContentGrid({
  layout = "compact",
  density = "normal",
  className = "",
  children = [],
} = {}) {
  const grid = document.createElement("section");
  grid.className = ["mha-widget-content-grid", className].filter(Boolean).join(" ");
  grid.dataset.innerLayout = normalizeWidgetInnerLayout(layout);
  grid.dataset.innerDensity = normalizeWidgetInnerDensity(density);
  grid.append(...normalizeChildren(children));
  return grid;
}

export function createWidgetContentRegion({
  region = "body",
  as = "div",
  className = "",
  children = [],
} = {}) {
  const tag = typeof as === "string" && as ? as : "div";
  const el = document.createElement(tag);
  el.className = ["mha-widget-content-region", `mha-widget-content-${region}`, className].filter(Boolean).join(" ");
  el.dataset.region = region;
  el.append(...normalizeChildren(children));
  return el;
}

export function createWidgetContentText({
  text = "",
  region = "text",
  as = "span",
  className = "",
} = {}) {
  const tag = typeof as === "string" && as ? as : "span";
  const el = document.createElement(tag);
  el.className = ["mha-widget-content-text", `mha-widget-content-${region}`, className].filter(Boolean).join(" ");
  el.textContent = text;
  return el;
}

export function createWidgetInnerGrid({
  widgetW = 1,
  widgetH = 1,
  scale = 4,
  className = "",
  ariaHidden = true,
} = {}) {
  const normalizedW = normalizeGridNumber(widgetW);
  const normalizedH = normalizeGridNumber(widgetH);
  const normalizedScale = Math.max(1, normalizeGridNumber(scale));
  const cols = normalizedW * normalizedScale;
  const rows = normalizedH * normalizedScale;

  const grid = document.createElement("div");
  grid.className = ["mha-widget-inner-grid", className].filter(Boolean).join(" ");
  grid.dataset.innerScale = String(normalizedScale);
  grid.dataset.innerCols = String(cols);
  grid.dataset.innerRows = String(rows);

  grid.style.setProperty("--mha-widget-inner-scale", String(normalizedScale));
  grid.style.setProperty("--mha-widget-inner-cols", String(cols));
  grid.style.setProperty("--mha-widget-inner-rows", String(rows));

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
 * Quadrupled internal grid unit.
 *
 * Use this for content inside .mha-widget-inner-grid. The inner grid resolution
 * is quadrupled by default:
 *
 * - external 2x1 widget -> internal 8x4 grid;
 * - external 2x2 widget -> internal 8x8 grid;
 * - external 3x2 widget -> internal 12x8 grid;
 * - external 4x2 widget -> internal 16x8 grid.
 *
 * The API mirrors createWidgetUnit(), but names the CSS variables with "inner"
 * so the internal and external placement systems stay conceptually separate.
 */
export function createWidgetInnerUnit({
  col = 1,
  row = 1,
  colSpan = 1,
  rowSpan = 1,
  area = "",
  className = "",
  align = "stretch",
  justify = "stretch",
  children = [],
} = {}) {
  const unit = document.createElement("div");

  unit.className = ["mha-widget-inner-unit", className].filter(Boolean).join(" ");
  unit.dataset.innerCol = String(normalizeGridNumber(col));
  unit.dataset.innerRow = String(normalizeGridNumber(row));
  unit.dataset.innerColSpan = String(normalizeGridNumber(colSpan));
  unit.dataset.innerRowSpan = String(normalizeGridNumber(rowSpan));

  if (area) unit.dataset.area = area;
  if (align) unit.dataset.align = align;
  if (justify) unit.dataset.justify = justify;

  unit.style.setProperty("--mha-widget-inner-unit-col", unit.dataset.innerCol);
  unit.style.setProperty("--mha-widget-inner-unit-row", unit.dataset.innerRow);
  unit.style.setProperty("--mha-widget-inner-unit-col-span", unit.dataset.innerColSpan);
  unit.style.setProperty("--mha-widget-inner-unit-row-span", unit.dataset.innerRowSpan);

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
