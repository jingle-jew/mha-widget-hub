/*
 * MHA Widget Layout helpers.
 *
 * The old widget micro-grid helpers were removed. Widgets now own their
 * internal layout directly and use --mha-widget-inner-padding as the shared
 * safe content inset.
 */

function normalizeChildren(children = []) {
  if (children === null || children === undefined) return [];
  return Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
}

export function createWidgetContentFrame({
  as = "div",
  className = "",
  children = [],
} = {}) {
  const tag = typeof as === "string" && as ? as : "div";
  const frame = document.createElement(tag);
  frame.className = ["mha-widget-content-frame", className].filter(Boolean).join(" ");
  frame.append(...normalizeChildren(children));
  return frame;
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
