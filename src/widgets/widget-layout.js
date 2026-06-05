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
