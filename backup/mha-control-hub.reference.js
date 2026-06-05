/*
 * MHA Control Hub — Grid Foundation
 *
 * Goal for this pass:
 * - keep the MHA v1 grid language: 2 widget units = 1 logical column;
 * - keep the widget size/density vocabulary;
 * - keep responsive auto / mobile / tablet / desktop layout rules;
 * - render completely empty widget surfaces only;
 * - keep the weather widget as an unlinked backup file, not as runtime code.
 */

const STORAGE_ORDER_KEY = "mha-grid-order";
const STORAGE_SIZE_KEY = "mha-widget-sizes";

const WIDGET_UNIT = Object.freeze({
  unitsPerLogicalColumn: 2,
  minHorizontal: { w: 2, h: 1 },
  minVertical: { w: 1, h: 2 },
  maxLandscape: { w: 6, h: 4 },
  maxPortrait: { w: 4, h: 6 },
});

const DEFAULT_WIDGETS = Object.freeze([
  { id: "slot-a", w: 4, h: 2 },
  { id: "slot-b", w: 4, h: 2 },
  { id: "slot-c", w: 4, h: 2 },
  { id: "slot-d", w: 2, h: 2 },
  { id: "slot-e", w: 2, h: 2 },
  { id: "slot-f", w: 4, h: 1 },
  { id: "slot-g", w: 3, h: 2 },
  { id: "slot-h", w: 3, h: 2 },
  { id: "slot-i", w: 2, h: 4 },
  { id: "slot-j", w: 4, h: 3 },
]);

const SIZE_PRESETS = Object.freeze([
  { w: 2, h: 1 },
  { w: 2, h: 2 },
  { w: 2, h: 4 },
  { w: 3, h: 2 },
  { w: 4, h: 1 },
  { w: 4, h: 2 },
  { w: 4, h: 3 },
  { w: 4, h: 4 },
  { w: 6, h: 3 },
  { w: 6, h: 4 },
]);

const ICONS = {
  edit: `<svg viewBox="0 0 24 24"><path d="M4 16.8V20h3.2L18.7 8.5l-3.2-3.2L4 16.8Zm16.4-10.7a1.1 1.1 0 0 0 0-1.6l-.9-.9a1.1 1.1 0 0 0-1.6 0l-1.1 1.1L20 7.9l.4-.4Z"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z"/></svg>`,
  move: `<svg viewBox="0 0 24 24"><path d="M11 2h2v5l2-2 1.4 1.4L12 10.8 7.6 6.4 9 5l2 2V2Zm0 15-2 2-1.4-1.4L12 13.2l4.4 4.4L15 19l-2-2v5h-2v-5ZM2 11h5L5 9l1.4-1.4L10.8 12l-4.4 4.4L5 15l2-2H2v-2Zm15 0h5v2h-5l2 2-1.4 1.4L13.2 12l4.4-4.4L19 9l-2 2Z"/></svg>`,
  resize: `<svg viewBox="0 0 24 24"><path d="M4 4h7v2H7.4l4.8 4.8-1.4 1.4L6 7.4V11H4V4Zm16 16h-7v-2h3.6l-4.8-4.8 1.4-1.4 4.8 4.8V13h2v7Z"/></svg>`,
};

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Local dev can still render with defaults if storage is unavailable.
  }
}

function normalizeWidgetSize({ w = 2, h = 1 } = {}) {
  let width = Math.round(Number(w));
  let height = Math.round(Number(h));

  if (!Number.isFinite(width)) width = 2;
  if (!Number.isFinite(height)) height = 1;

  width = Math.max(1, Math.min(6, width));
  height = Math.max(1, Math.min(6, height));

  // Same product rule as MHA v1: 1x1 is not a useful family dashboard control.
  if (width === 1 && height === 1) width = 2;

  // Keep the max footprint bounded: landscape max 6x4, portrait max 4x6.
  if (width > 4 && height > 4) {
    if (width >= height) height = 4;
    else width = 4;
  }

  return { w: width, h: height };
}

function getWidgetDensity(size = {}) {
  const { w, h } = normalizeWidgetSize(size);

  if (h <= 1 && w <= 2) return "micro";
  if (h <= 1) return "compact";
  if (h === 2) return "standard";
  if (h === 3 && w >= 6) return "panel";
  if (h === 3) return "rich";
  if (h >= 4 && w >= 6) return "panel";
  if (h >= 4) return "immersive";
  return "standard";
}

function sizeToString({ w, h }) {
  return `${w}x${h}`;
}

function getNextPreset(current) {
  const normalized = normalizeWidgetSize(current);
  const currentKey = sizeToString(normalized);
  const index = SIZE_PRESETS.findIndex((preset) => sizeToString(preset) === currentKey);
  return SIZE_PRESETS[(index + 1 + SIZE_PRESETS.length) % SIZE_PRESETS.length];
}

class MhaControlHub extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._hass = null;
    this._isEditing = false;
    this._draggedId = "";
    this._resizeState = null;
    this._widgets = this._readWidgets();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this.render();
    this._clockTimer = window.setInterval(() => this._updateStatusTime(), 1000);
    this._resizeListener = () => {
      if (this._getLayoutMode() === "auto") {
        this.render();
        return;
      }
      this._syncSquareUnit();
    };
    window.addEventListener("resize", this._resizeListener);
  }

  disconnectedCallback() {
    window.clearInterval(this._clockTimer);
    window.removeEventListener("resize", this._resizeListener);
  }

  requestRender() {
    this.render();
  }

  toggleEditMode() {
    this._isEditing = !this._isEditing;
    this.render();
  }

  resetGrid() {
    localStorage.removeItem(STORAGE_ORDER_KEY);
    localStorage.removeItem(STORAGE_SIZE_KEY);
    this._widgets = this._readWidgets();
    this.render();
  }

  _readWidgets() {
    const defaultById = new Map(DEFAULT_WIDGETS.map((widget) => [widget.id, widget]));
    const storedOrder = readJson(STORAGE_ORDER_KEY, DEFAULT_WIDGETS.map((widget) => widget.id));
    const storedSizes = readJson(STORAGE_SIZE_KEY, {});

    const order = Array.isArray(storedOrder) ? storedOrder.filter((id) => defaultById.has(id)) : [];
    DEFAULT_WIDGETS.forEach((widget) => {
      if (!order.includes(widget.id)) order.push(widget.id);
    });

    return order.map((id) => ({
      ...defaultById.get(id),
      ...normalizeWidgetSize(storedSizes[id] || defaultById.get(id)),
    }));
  }

  _saveWidgets() {
    writeJson(STORAGE_ORDER_KEY, this._widgets.map((widget) => widget.id));

    const sizes = {};
    this._widgets.forEach((widget) => {
      sizes[widget.id] = normalizeWidgetSize(widget);
    });
    writeJson(STORAGE_SIZE_KEY, sizes);
  }

  _moveWidget(sourceId, targetId, placement = "before") {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = this._widgets.findIndex((widget) => widget.id === sourceId);
    const targetIndex = this._widgets.findIndex((widget) => widget.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...this._widgets];
    const [moved] = next.splice(sourceIndex, 1);
    const adjustedTargetIndex = next.findIndex((widget) => widget.id === targetId);
    const insertIndex = placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
    next.splice(insertIndex, 0, moved);

    this._widgets = next;
    this._saveWidgets();
    this.render();
  }

  _cycleWidgetSize(widgetId) {
    this._widgets = this._widgets.map((widget) => {
      if (widget.id !== widgetId) return widget;
      return {
        ...widget,
        ...getNextPreset(widget),
      };
    });

    this._saveWidgets();
    this.render();
  }

  _removeWidget(widgetId) {
    this._widgets = this._widgets.filter((widget) => widget.id !== widgetId);
    this._saveWidgets();
    this.render();
  }

  _getLayoutMode() {
    const explicit = this.dataset.layout || document.documentElement.dataset.layout;
    const mode = this.dataset.layoutMode || document.documentElement.dataset.layoutMode || explicit || "auto";

    // Migration alias: MHA v1 used "wallpanel"; current calls that layout "tablet".
    if (mode === "wallpanel") return "tablet";

    return ["auto", "mobile", "tablet", "desktop"].includes(mode) ? mode : "auto";
  }

  _getEffectiveLayout() {
    const mode = this._getLayoutMode();

    if (mode !== "auto") return mode;

    const width = this.getBoundingClientRect().width || window.innerWidth || 0;
    if (width >= 1180) return "desktop";
    if (width >= 700) return "tablet";
    return "mobile";
  }

  _getLogicalColumnCount(layout = this._getEffectiveLayout()) {
    const rect = this.getBoundingClientRect();
    const width = rect.width || window.innerWidth || 0;
    const height = rect.height || window.innerHeight || 0;
    const isLandscape = width > height;

    /*
     * current hard rules:
     * 1 logical column = 2 widget units.
     *
     * Mobile portrait must NEVER exceed 1 logical column / 2 widget units.
     * Mobile landscape can use 2 logical columns / 4 widget units.
     */
    if (layout === "mobile") return isLandscape ? 2 : 1;

    if (layout === "tablet") {
      if (isLandscape) return width >= 1000 ? 5 : 4;
      return width >= 760 ? 3 : 2;
    }

    if (width >= 1720) return 6;
    if (width >= 1360) return 5;
    return 4;
  }

  _getActiveGridUnits(layout = this._getEffectiveLayout()) {
    return this._getLogicalColumnCount(layout) * WIDGET_UNIT.unitsPerLogicalColumn;
  }

  _syncSquareUnit() {
    const grid = this.shadowRoot.querySelector(".mha-grid");
    if (!grid) return;

    const styles = getComputedStyle(grid);
    const units = this._getActiveGridUnits();
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const width = grid.clientWidth;
    const unit = Math.max(44, Math.floor((width - gap * (units - 1)) / units));

    grid.style.setProperty("--mha-square-unit", `${unit}px`);
  }

  _getDropPlacement(event, target) {
    const rect = target.getBoundingClientRect();
    const horizontal = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    const upper = rect.top + rect.height * 0.35;
    const lower = rect.top + rect.height * 0.65;

    if (event.clientY < upper) return "before";
    if (event.clientY > lower) return "after";
    return horizontal;
  }

  _clearDropState() {
    this.shadowRoot.querySelectorAll(".is-drop-before, .is-drop-after").forEach((node) => {
      node.classList.remove("is-drop-before", "is-drop-after");
      node.removeAttribute("data-drop-placement");
    });
  }

  _wireDrag(widgetEl, widget) {
    if (!this._isEditing) return;

    widgetEl.draggable = true;
    widgetEl.addEventListener("dragstart", (event) => {
      if (event.target.closest(".mha-widget-tools")) {
        event.preventDefault();
        return;
      }

      this._draggedId = widget.id;
      widgetEl.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", widget.id);
    });

    widgetEl.addEventListener("dragover", (event) => {
      const sourceId = this._draggedId || event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === widget.id) return;

      event.preventDefault();
      const placement = this._getDropPlacement(event, widgetEl);
      this._clearDropState();
      widgetEl.classList.toggle("is-drop-before", placement === "before");
      widgetEl.classList.toggle("is-drop-after", placement === "after");
      widgetEl.dataset.dropPlacement = placement;
    });

    widgetEl.addEventListener("drop", (event) => {
      const sourceId = this._draggedId || event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === widget.id) return;

      event.preventDefault();
      const placement = widgetEl.dataset.dropPlacement || "before";
      this._clearDropState();
      this._draggedId = "";
      this._moveWidget(sourceId, widget.id, placement);
    });

    widgetEl.addEventListener("dragend", () => {
      this._draggedId = "";
      widgetEl.classList.remove("is-dragging");
      this._clearDropState();
    });
  }

  _createWidget(widget, index) {
    const size = normalizeWidgetSize(widget);
    const density = getWidgetDensity(size);
    const el = document.createElement("article");

    el.className = "mha-widget";
    el.dataset.widgetId = widget.id;
    const effectiveW = Math.min(size.w, this._getActiveGridUnits());
    el.dataset.widgetConfiguredW = String(size.w);
    el.dataset.widgetW = String(effectiveW);
    el.dataset.widgetH = String(size.h);
    el.dataset.widgetSize = sizeToString(size);
    el.dataset.widgetDensity = density;
    el.setAttribute("aria-label", `Emplacement vide ${index + 1}`);

    // Completely empty by design. Only edit chrome is added in edit mode.
    if (this._isEditing) {
      const tools = document.createElement("div");
      tools.className = "mha-widget-tools";

      const move = this._toolButton("Déplacer", "move", () => {});
      const remove = this._toolButton("Supprimer", "close", () => this._removeWidget(widget.id));

      tools.append(move, remove);

      const handle = document.createElement("button");
      handle.className = "mha-resize-handle";
      handle.type = "button";
      handle.setAttribute("aria-label", "Redimensionner le widget");
      handle.innerHTML = ICONS.resize;
      handle.addEventListener("pointerdown", (event) => this._startResize(event, widget.id));

      const badge = document.createElement("span");
      badge.className = "mha-size-badge";
      badge.textContent = `${sizeToString(size)} · ${density}`;

      el.append(tools, handle, badge);
    }

    this._wireDrag(el, widget);
    return el;
  }

  _getGridMetrics() {
    const grid = this.shadowRoot.querySelector(".mha-grid");
    if (!grid) return null;

    const styles = getComputedStyle(grid);
    const columns = styles.gridTemplateColumns
      .split(" ")
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const rowHeight = Number.parseFloat(styles.gridAutoRows)
      || Number.parseFloat(styles.getPropertyValue("--mha-square-unit"))
      || 72;
    const columnWidth = columns[0] || 76;

    return {
      grid,
      columnWidth,
      rowHeight,
      gap,
      columnStep: columnWidth + gap,
      rowStep: rowHeight + gap,
    };
  }

  _startResize(event, widgetId) {
    if (!this._isEditing) return;
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const widget = this._widgets.find((item) => item.id === widgetId);
    const metrics = this._getGridMetrics();
    if (!widget || !metrics) return;

    const handle = event.currentTarget;
    const card = handle.closest(".mha-widget");

    this._resizeState = {
      widgetId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startW: widget.w,
      startH: widget.h,
      metrics,
    };

    card?.classList.add("is-resizing");
    handle.setPointerCapture?.(event.pointerId);

    const onMove = (moveEvent) => this._updateResize(moveEvent);
    const onEnd = (endEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      this._finishResize(endEvent);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd, { passive: false });
    window.addEventListener("pointercancel", onEnd, { passive: false });
  }

  _updateResize(event) {
    const state = this._resizeState;
    if (!state || event.pointerId !== state.pointerId) return;

    event.preventDefault();

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    const deltaW = Math.round(dx / state.metrics.columnStep);
    const deltaH = Math.round(dy / state.metrics.rowStep);

    const nextSize = normalizeWidgetSize({
      w: state.startW + deltaW,
      h: state.startH + deltaH,
    });

    this._widgets = this._widgets.map((widget) => {
      if (widget.id !== state.widgetId) return widget;
      return { ...widget, ...nextSize };
    });

    const widgetEl = this.shadowRoot.querySelector(`[data-widget-id="${state.widgetId}"]`);
    if (widgetEl) {
      const density = getWidgetDensity(nextSize);
      const effectiveW = Math.min(nextSize.w, this._getActiveGridUnits());
      widgetEl.dataset.widgetConfiguredW = String(nextSize.w);
      widgetEl.dataset.widgetW = String(effectiveW);
      widgetEl.dataset.widgetH = String(nextSize.h);
      widgetEl.dataset.widgetSize = sizeToString(nextSize);
      widgetEl.dataset.widgetDensity = density;

      const badge = widgetEl.querySelector(".mha-size-badge");
      if (badge) badge.textContent = `${sizeToString(nextSize)} · ${density}`;
    }
  }

  _finishResize(event) {
    const state = this._resizeState;
    if (!state) return;

    const widgetEl = this.shadowRoot.querySelector(`[data-widget-id="${state.widgetId}"]`);
    widgetEl?.classList.remove("is-resizing");

    this._resizeState = null;
    this._saveWidgets();
    this.render();
  }

  _toolButton(label, icon, onClick) {
    const button = document.createElement("button");
    button.className = "mha-tool-button";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.innerHTML = ICONS[icon] || "";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick?.();
    });
    return button;
  }

  _updateStatusTime() {
    const time = this.shadowRoot.querySelector("[data-status-time]");
    const date = this.shadowRoot.querySelector("[data-status-date]");
    if (!time || !date) return;

    const now = new Date();
    time.textContent = new Intl.DateTimeFormat("fr-CA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

    date.textContent = new Intl.DateTimeFormat("fr-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now);
  }

  render() {
    const layoutMode = this._getLayoutMode();
    const layout = this._getEffectiveLayout();

    const activeGridUnits = this._getActiveGridUnits(layout);

    this.dataset.layoutMode = layoutMode;
    this.dataset.layout = layout;
    this.dataset.gridUnits = String(activeGridUnits);
    this.dataset.logicalColumns = String(activeGridUnits / WIDGET_UNIT.unitsPerLogicalColumn);
    this.style.setProperty("--mha-runtime-grid-units", String(activeGridUnits));
    this.classList.toggle("is-editing", this._isEditing);

    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>

      <div class="mha-background" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <main class="mha-shell">
        <header class="mha-status-bar">
          <div class="mha-status-brand">
            <span class="mha-dot"></span>
            <strong>MHA</strong>
            <span>Grid foundation</span>
          </div>
          <div class="mha-status-meta">
            <span>${layoutMode === "auto" ? `auto → ${layout}` : layout}</span>
            <span>${activeGridUnits / WIDGET_UNIT.unitsPerLogicalColumn} cols · ${activeGridUnits} units</span>
            <span data-status-date>—</span>
            <strong data-status-time>—</strong>
          </div>
        </header>

        <section class="mha-grid" aria-label="Grille de widgets vides"></section>

        <nav class="mha-dock" aria-label="Dock vide">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </nav>
      </main>

      <button class="mha-edit-button" type="button" aria-label="Mode édition" aria-pressed="${this._isEditing}">
        ${this._isEditing ? ICONS.close : ICONS.edit}
      </button>
    `;

    const grid = this.shadowRoot.querySelector(".mha-grid");
    this._widgets.forEach((widget, index) => grid.append(this._createWidget(widget, index)));

    this.shadowRoot.querySelector(".mha-edit-button").addEventListener("click", () => this.toggleEditMode());

    this._syncSquareUnit();
    this._updateStatusTime();
  }
}

const CSS = `
  :host {
    --mha-units-per-logical-column: 2;

    /*
     * Logical columns are now 2 widget units wide.
     *
     * mobile portrait   = 1 logical column  = 2 units
     * mobile landscape  = 2 logical columns = 4 units
     * tablet portrait   = 2 logical columns = 4 units
     * tablet landscape  = 3 logical columns = 6 units
     * desktop landscape = 3–4 logical cols  = 6–8 units
     */
    --mha-widget-width-units-mobile-portrait: 2;
    --mha-widget-width-units-mobile-landscape: 4;
    --mha-widget-width-units-tablet-portrait: 4;
    --mha-widget-width-units-tablet-landscape: 6;
    --mha-widget-width-units-desktop: 6;
    --mha-widget-width-units-desktop-wide: 8;

    --mha-page-padding-mobile: 18px;
    --mha-page-padding-tablet: 24px;
    --mha-page-padding-desktop: 28px;

    --mha-gap-mobile: 12px;
    --mha-gap-tablet: 16px;
    --mha-gap-desktop: 18px;

    --mha-bar-height: 54px;
    --mha-floating-edge: max(18px, env(safe-area-inset-bottom));
    --mha-floating-top: max(18px, env(safe-area-inset-top));

    --mha-radius-shell: 34px;
    --mha-radius-widget: 28px;
    --mha-radius-widget-inner: 22px;
    --mha-radius-pill: 999px;

    /*
     * Square-unit grid:
     * - mobile uses 2 widget units = 1 logical column;
     * - tablet/desktop use 12 widget units = 3 logical columns;
     * - grid-auto-rows is calculated from the actual grid width so 2x2, 4x4,
     *   6x6, etc. are visually square.
     */
    --mha-widget-width-units-mobile-portrait: 2;
    --mha-widget-width-units-mobile-landscape: 4;
    --mha-widget-width-units-tablet-portrait: 4;
    --mha-widget-width-units-tablet-landscape: 6;
    --mha-widget-width-units-desktop: 6;
    --mha-widget-width-units-desktop-wide: 8;
    --mha-square-unit: 72px;

    --mha-widget-padding: clamp(14px, 2vw, 22px);
    --mha-widget-bg: rgba(255, 255, 255, 0.105);
    --mha-widget-bg-edit: rgba(255, 255, 255, 0.145);
    --mha-widget-border: rgba(255, 255, 255, 0.16);
    --mha-widget-border-edit: rgba(255, 255, 255, 0.34);
    --mha-text: rgba(255, 255, 255, 0.92);
    --mha-muted: rgba(255, 255, 255, 0.56);

    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: var(--mha-text);
    background: #050509;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
  }

  :host-context(html[data-theme="light"]) {
    --mha-widget-bg: rgba(255, 255, 255, 0.62);
    --mha-widget-bg-edit: rgba(255, 255, 255, 0.78);
    --mha-widget-border: rgba(20, 20, 32, 0.12);
    --mha-widget-border-edit: rgba(20, 20, 32, 0.28);
    --mha-text: rgba(15, 17, 24, 0.92);
    --mha-muted: rgba(15, 17, 24, 0.56);
    background: #eef0f8;
  }

  .mha-background {
    position: absolute;
    inset: -20%;
    overflow: hidden;
    background:
      radial-gradient(circle at 20% 15%, rgba(113, 128, 255, 0.32), transparent 30%),
      radial-gradient(circle at 78% 28%, rgba(255, 112, 178, 0.28), transparent 32%),
      radial-gradient(circle at 52% 90%, rgba(56, 209, 255, 0.22), transparent 36%),
      linear-gradient(135deg, #06070d 0%, #111320 100%);
  }

  :host-context(html[data-theme="light"]) .mha-background {
    background:
      radial-gradient(circle at 20% 15%, rgba(101, 123, 255, 0.28), transparent 30%),
      radial-gradient(circle at 78% 28%, rgba(255, 134, 192, 0.22), transparent 32%),
      radial-gradient(circle at 52% 90%, rgba(70, 194, 255, 0.2), transparent 36%),
      linear-gradient(135deg, #f7f8ff 0%, #e9ecf7 100%);
  }

  .mha-background span {
    position: absolute;
    width: 42vmax;
    height: 42vmax;
    border-radius: 999px;
    filter: blur(64px);
    opacity: 0.38;
    animation: mha-float 22s ease-in-out infinite alternate;
  }

  .mha-background span:nth-child(1) { left: 4%; top: 8%; background: #6d7cff; }
  .mha-background span:nth-child(2) { right: 4%; top: 18%; background: #ff69b8; animation-delay: -7s; }
  .mha-background span:nth-child(3) { left: 24%; bottom: -8%; background: #35cfff; animation-delay: -12s; }
  .mha-background span:nth-child(4) { right: 18%; bottom: 2%; background: #a970ff; animation-delay: -16s; }

  @keyframes mha-float {
    from { transform: translate3d(-3%, -2%, 0) scale(0.96); }
    to { transform: translate3d(4%, 3%, 0) scale(1.08); }
  }

  .mha-shell {
    position: relative;
    z-index: 1;
    height: 100%;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    gap: var(--mha-gap-desktop);
    padding: var(--mha-page-padding-desktop);
    box-sizing: border-box;
  }

  :host([data-layout="mobile"]) .mha-shell {
    gap: var(--mha-gap-mobile);
    padding: var(--mha-page-padding-mobile);
  }

  :host([data-layout="tablet"]) .mha-shell {
    gap: var(--mha-gap-tablet);
    padding: var(--mha-page-padding-tablet);
  }

  .mha-status-bar,
  .mha-dock {
    min-height: var(--mha-bar-height);
    border: 1px solid var(--mha-widget-border);
    border-radius: var(--mha-radius-pill);
    background: rgba(255, 255, 255, 0.09);
    backdrop-filter: blur(26px) saturate(150%);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  }

  .mha-status-bar {
    position: absolute;
    z-index: 8;
    top: var(--mha-floating-top);
    left: 50%;
    width: min(760px, calc(100% - (var(--mha-page-padding-desktop) * 2)));
    height: var(--mha-bar-height);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 18px;
    box-sizing: border-box;
    pointer-events: auto;
  }

  :host([data-layout="mobile"]) .mha-status-bar {
    width: min(390px, calc(100% - (var(--mha-page-padding-mobile) * 2)));
  }

  :host([data-layout="tablet"]) .mha-status-bar {
    width: min(720px, calc(100% - (var(--mha-page-padding-wallpanel) * 2)));
  }

  .mha-status-brand,
  .mha-status-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--mha-muted);
    font-size: 13px;
    white-space: nowrap;
  }

  .mha-status-brand strong,
  .mha-status-meta strong {
    color: var(--mha-text);
  }

  .mha-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.7;
  }

  :host([data-layout="mobile"]) .mha-status-meta span:nth-child(2),
  :host([data-layout="mobile"]) .mha-status-meta span:nth-child(3) {
    display: none;
  }

  .mha-grid {
    min-height: 0;
    overflow: auto;
    display: grid;
    gap: var(--mha-gap-desktop);
    align-content: start;
    padding: 2px;
    scrollbar-width: none;
  }

  .mha-grid::-webkit-scrollbar { display: none; }

  :host([data-layout="mobile"]) .mha-grid,
  :host([data-layout="tablet"]) .mha-grid,
  :host([data-layout="desktop"]) .mha-grid {
    --mha-active-grid-units: 2;
    grid-template-columns: repeat(var(--mha-active-grid-units), minmax(0, 1fr));
    grid-auto-rows: var(--mha-square-unit);
    grid-auto-flow: dense;
  }

  :host([data-grid-units="2"]) .mha-grid { --mha-active-grid-units: 2; }
  :host([data-grid-units="4"]) .mha-grid { --mha-active-grid-units: 4; }
  :host([data-grid-units="6"]) .mha-grid { --mha-active-grid-units: 6; }
  :host([data-grid-units="8"]) .mha-grid { --mha-active-grid-units: 8; }
  :host([data-grid-units="10"]) .mha-grid { --mha-active-grid-units: 10; }
  :host([data-grid-units="12"]) .mha-grid { --mha-active-grid-units: 12; }

  .mha-widget {
    position: relative;
    display: block;
    min-width: 0;
    border: 1px solid var(--mha-widget-border);
    border-radius: var(--mha-radius-widget);
    background: var(--mha-widget-bg);
    backdrop-filter: blur(26px) saturate(145%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 18px 54px rgba(0, 0, 0, 0.16);
    box-sizing: border-box;
    overflow: hidden;
  }

  .mha-widget::before {
    content: "";
    position: absolute;
    inset: 10px;
    border: 1px dashed transparent;
    border-radius: var(--mha-radius-widget-inner);
    pointer-events: none;
  }

  :host(.is-editing) .mha-widget {
    background: var(--mha-widget-bg-edit);
    border-color: var(--mha-widget-border-edit);
    cursor: grab;
  }

  :host(.is-editing) .mha-widget::before {
    border-color: rgba(255, 255, 255, 0.22);
  }

  :host(.is-editing) .mha-widget:active {
    cursor: grabbing;
  }

  .mha-widget.is-dragging {
    opacity: 0.55;
    transform: scale(0.985);
  }

  .mha-widget.is-drop-before,
  .mha-widget.is-drop-after {
    outline: 2px solid rgba(135, 195, 255, 0.95);
    outline-offset: 3px;
  }

  .mha-widget-tools {
    position: absolute;
    z-index: 2;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 6px;
  }


  .mha-resize-handle {
    position: absolute;
    z-index: 3;
    right: 0;
    bottom: 0;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: end;
    padding: 0 13px 13px 0;
    border: 0;
    border-radius: var(--mha-radius-widget) 0 var(--mha-radius-widget) 0;
    background:
      linear-gradient(135deg, transparent 0 42%, rgba(255, 255, 255, 0.23) 43% 100%);
    color: var(--mha-text);
    cursor: nwse-resize;
    opacity: 0.96;
    touch-action: none;
  }

  .mha-resize-handle::before {
    content: "";
    position: absolute;
    right: 9px;
    bottom: 9px;
    width: 23px;
    height: 23px;
    border-right: 5px solid currentColor;
    border-bottom: 5px solid currentColor;
    border-radius: 0 0 9px 0;
    opacity: 0.78;
  }

  .mha-resize-handle svg {
    width: 17px;
    height: 17px;
    fill: currentColor;
    opacity: 0;
  }

  .mha-widget.is-resizing {
    outline: 2px solid rgba(135, 195, 255, 0.95);
    outline-offset: 3px;
    transform: scale(1.01);
  }

  .mha-tool-button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.24);
    color: var(--mha-text);
    cursor: pointer;
  }

  .mha-tool-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .mha-size-badge {
    position: absolute;
    left: 14px;
    bottom: 14px;
    z-index: 2;
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.2);
    color: var(--mha-muted);
    font-size: 12px;
    font-weight: 750;
    letter-spacing: 0.01em;
  }

  .mha-dock {
    position: absolute;
    z-index: 8;
    left: 50%;
    bottom: var(--mha-floating-edge);
    width: min(420px, calc(100% - (var(--mha-page-padding-desktop) * 2)));
    height: var(--mha-bar-height);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    pointer-events: auto;
  }

  :host([data-layout="mobile"]) .mha-dock {
    width: min(360px, calc(100% - (var(--mha-page-padding-mobile) * 2)));
  }

  :host([data-layout="tablet"]) .mha-dock {
    width: min(420px, calc(100% - (var(--mha-page-padding-wallpanel) * 2)));
  }

  .mha-dock span {
    width: 38px;
    height: 38px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.13);
  }

  .mha-edit-button {
    position: absolute;
    z-index: 10;
    right: 22px;
    bottom: 22px;
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border: 1px solid var(--mha-widget-border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.15);
    color: var(--mha-text);
    backdrop-filter: blur(26px) saturate(150%);
    cursor: pointer;
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.28);
  }

  .mha-edit-button svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }

  .mha-widget[data-widget-h="1"] { min-height: var(--mha-card-height-1x); }
  .mha-widget[data-widget-h="2"] { min-height: var(--mha-card-height-2x); }
  .mha-widget[data-widget-h="3"] { min-height: var(--mha-card-height-3x); }
  .mha-widget[data-widget-h="4"] { min-height: var(--mha-card-height-4x); }
  .mha-widget[data-widget-h="5"] { min-height: var(--mha-card-height-5x); }
  .mha-widget[data-widget-h="6"] { min-height: var(--mha-card-height-6x); }

  :host([data-layout="tablet"]) .mha-widget[data-widget-w="1"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-w="1"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="1"] { grid-column: span 1; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-w="2"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-w="2"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="2"] { grid-column: span 2; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-w="3"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-w="3"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="3"] { grid-column: span 3; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-w="4"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-w="4"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="4"] { grid-column: span 4; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-w="5"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-w="5"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="5"] { grid-column: span 5; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-w="6"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-w="6"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="6"] { grid-column: span 6; }


  :host([data-layout="mobile"]) .mha-widget[data-widget-w="5"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-w="6"] {
    grid-column: span 4;
  }

  :host([data-layout="tablet"]) .mha-widget[data-widget-h="1"]
  :host([data-layout="desktop"]) .mha-widget[data-widget-h="1"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-h="1"] { grid-row: span 1; min-height: 0; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-h="2"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-h="2"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-h="2"] { grid-row: span 2; min-height: 0; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-h="3"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-h="3"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-h="3"] { grid-row: span 3; min-height: 0; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-h="4"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-h="4"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-h="4"] { grid-row: span 4; min-height: 0; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-h="5"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-h="5"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-h="5"] { grid-row: span 5; min-height: 0; }

  :host([data-layout="tablet"]) .mha-widget[data-widget-h="6"],
  :host([data-layout="desktop"]) .mha-widget[data-widget-h="6"],
  :host([data-layout="mobile"]) .mha-widget[data-widget-h="6"] { grid-row: span 6; min-height: 0; }

  @media (prefers-reduced-motion: reduce) {
    .mha-background span {
      animation: none;
    }
  }
`;

customElements.define("mha-control-hub", MhaControlHub);
