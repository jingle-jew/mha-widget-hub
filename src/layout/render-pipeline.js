import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import {
  createCriticalBootStyle,
  createFrontendStyleLinks,
} from "../core/mha-frontend-assets.js";
import { t } from "../i18n/index.js";
import { createMobileDock } from "./mobile-dock.js";
import { createShell } from "./shell.js";
import {
  getEffectiveLayout,
  getInternalGridColumnCountFromLogical,
  getInternalGridRowCountFromLogical,
  getLayoutMode,
  getWidgetDensity,
  normalizeWidgetSize,
  sizeToString,
} from "./layout-engine.js";
import { createSettingsPanel } from "../settings/settings-panel.js";
import {
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  createPageCreatorPanel,
  createWidgetConfigPanel,
  createWidgetManagerPanel,
  syncWidgetSurfaceOpenState,
} from "../widgets/widget-placement-orchestrator.js";

export function createRenderPipeline(host, options = {}) {
  const {
    frontendRootUrl,
    frontendVersion,
    styleManifest = [],
  } = options;

  function createWidgetPlaceholder(widget, { units, position }) {
    const size = normalizeWidgetSize(widget);
    const effectiveWidgetW = Math.min(size.w, units);
    const el = document.createElement("article");
    el.className = "mha-widget mha-widget-placeholder";
    el.dataset.widgetPlaceholderId = widget.id;
    el.dataset.widgetConfiguredW = String(size.w);
    el.dataset.widgetW = String(effectiveWidgetW);
    el.dataset.widgetH = String(size.h);
    el.dataset.widgetSize = sizeToString(size);
    el.dataset.widgetDensity = getWidgetDensity(size);
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--mha-widget-w", String(effectiveWidgetW));
    el.style.setProperty("--mha-widget-configured-w", String(size.w));
    el.style.setProperty("--mha-widget-h", String(size.h));
    if (position) {
      el.style.gridColumn = `${position.x} / span ${effectiveWidgetW}`;
      el.style.gridRow = `${position.y} / span ${size.h}`;
    }
    return el;
  }

  function appendWidgetPlaceholders(grid, { units, positions }) {
    const fragment = document.createDocumentFragment();
    host._widgets.forEach((widget) => {
      const placeholder = Object.hasOwn(host, "_createWidgetPlaceholder")
        ? host._createWidgetPlaceholder(widget, {
          units,
          position: positions?.[widget.id],
        })
        : createWidgetPlaceholder(widget, {
          units,
          position: positions?.[widget.id],
        });
      fragment.append(placeholder);
    });
    grid.append(fragment);
    host.dataset.widgetsState = host._widgets.length ? "loading" : "ready";
  }

  function startProgressiveWidgetRender({ grid, units, positions, renderId }) {
    cancelAnimationFrame(host._widgetRenderFrame);
    const queue = [...host._widgets];
    const batchSize = getEffectiveLayout(host) === "mobile" ? 1 : 2;

    const renderBatch = () => {
      host._widgetRenderFrame = 0;
      if (!host.isConnected || host._renderId !== renderId) return;

      const fragment = document.createDocumentFragment();
      const replacements = [];
      queue.splice(0, batchSize).forEach((widget) => {
        const placeholder = grid.querySelector(`[data-widget-placeholder-id="${widget.id}"]`);
        const el = host._createWidgetElement(widget, {
          units,
          position: positions?.[widget.id],
        });
        if (placeholder) replacements.push([placeholder, el]);
        else fragment.append(el);
      });

      replacements.forEach(([placeholder, el]) => placeholder.replaceWith(el));
      if (fragment.childNodes.length) grid.append(fragment);
      if (queue.length) {
        host._widgetRenderFrame = requestAnimationFrame(renderBatch);
        return;
      }

      host.dataset.widgetsState = "ready";
      host._scheduleSquareUnitSync();
      host._scheduleHassUpdate();
      host._syncEditModeDom?.();
      host._syncWidgetDropSlots();
      host._scheduleIconSymbolRefresh();
    };

    host._widgetRenderFrame = requestAnimationFrame(renderBatch);
  }

  function appendPrimaryControls() {
    const edit = document.createElement("button");
    edit.className = "mha-edit-button mha-main-edit-button mha-primary-edit-button";
    edit.type = "button";
    edit.innerHTML = host._getEditButtonIcon?.(host._isEditing) || "";
    edit.onclick = () => host.toggleEditMode();
    host.shadowRoot.append(edit);

    const addWidget = document.createElement("button");
    addWidget.className = "mha-edit-button mha-main-edit-button mha-add-widget-button";
    addWidget.type = "button";
    addWidget.innerHTML = `<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>`;
    addWidget.setAttribute("aria-label", t("settings.addWidget", "Add widget"));
    addWidget.hidden = !host._isEditing;
    addWidget.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      host._openWidgetManager();
    };
    host.shadowRoot.append(addWidget);
    host.classList.toggle("is-editing", host._isEditing);
    host.dataset.editing = String(host._isEditing);
  }

  function appendDeferredUi({ layout, renderId }) {
    cancelAnimationFrame(host._secondaryUiFrame);
    host._secondaryUiFrame = requestAnimationFrame(() => {
      host._secondaryUiFrame = 0;
      if (!host.isConnected || host._renderId !== renderId) return;

      if (layout !== "mobile") {
        host.shadowRoot.append(createMobileDock(host._getDockProps()));
      }

      const settingsPanels = host._getSettingsPanelsProps();
      host.shadowRoot.append(host._screensaverCoordinator.createDomElement());
      host.shadowRoot.append(createSettingsPanel(settingsPanels.all));
      host.shadowRoot.append(createWidgetManagerPanel(buildWidgetManagerPanelProps({
        open: host._widgetManagerOpen,
        activeCategory: host._widgetManagerCategory,
        categories: host._getWidgetManagerCategories?.() || [],
        onClose: () => host._closeWidgetManager(),
        onBack: () => host._showWidgetManagerCategories(),
        onSelectCategory: (id) => host._selectWidgetManagerCategory(id),
        onSelectWidget: (item) => host._beginWidgetPlacement(item),
      })));
      host.shadowRoot.append(createPageCreatorPanel(host._pageUiCoordinator.buildPageCreatorProps()));
      host.shadowRoot.append(createWidgetConfigPanel(buildWidgetConfigPanelProps({
        session: host._widgetConfigSession,
        hass: host._hass,
        visibilityConfig: host._entityVisibilityConfig,
        onCancel: () => host._closeWidgetConfig(),
        onSave: () => host._saveWidgetConfig(),
        onRerender: () => host._syncWidgetConfigDom(),
      })));
      host.shadowRoot.append(createSettingsPanel(settingsPanels.screensaver));
      syncWidgetSurfaceOpenState(host.shadowRoot);
      host._syncEditModeDom();
      host._syncScreensaverVisibilityState();
      host._scheduleIconSymbolRefresh();
    });
  }

  function buildRenderContext(themeState) {
    const layoutMode = getLayoutMode(host);
    const layout = getEffectiveLayout(host);
    const preset = host._getRuntimeGridPreset();
    const units = getInternalGridColumnCountFromLogical(preset.columns);
    const rows = getInternalGridRowCountFromLogical(preset.rows);
    const cols = preset.columns;
    const logicalRows = preset.rows;
    const { themeStyle, iconShapeSetting, iconShape, accent } = themeState;
    return {
      renderId: host._renderId + 1,
      themeState,
      layoutMode,
      layout,
      preset,
      units,
      rows,
      cols,
      logicalRows,
      themeStyle,
      iconShapeSetting,
      iconShape,
      accent,
    };
  }

  function prepareRenderCycle({ renderId, themeState }) {
    host._applyCustomWallpaperState(themeState);
    host._applyHaSidebarMode(host._hideHaSidebar);
    host._renderId = renderId;
    cancelAnimationFrame(host._widgetRenderFrame);
    cancelAnimationFrame(host._secondaryUiFrame);
    host._clearGridScrollListener();
    host._stylesReadyRenderId = 0;
    host.dataset.widgetsState = "pending";
  }

  function applyRenderDatasetsAndRuntimeVars({
    themeStyle,
    iconShapeSetting,
    iconShape,
    layoutMode,
    layout,
    preset,
    units,
    rows,
    cols,
    logicalRows,
    accent,
  }) {
    host.dataset.themeStyle = themeStyle;
    host.dataset.iconShapeSetting = iconShapeSetting;
    host.dataset.iconShape = iconShape;
    host.dataset.layoutMode = layoutMode;
    host.dataset.layout = layout;
    host.dataset.dockPosition = host._dockPosition;
    host.dataset.gridDensity = preset.density;
    host.dataset.gridUnits = String(units);
    host.dataset.logicalColumns = String(cols);
    host.dataset.gridRows = String(rows);
    host.dataset.logicalRows = String(logicalRows);
    host.classList.toggle("is-editing", host._isEditing);
    host.style.setProperty("--mha-runtime-grid-units", String(units));
    host.style.setProperty("--mha-runtime-grid-rows", String(rows));
    host.style.setProperty("--mha-runtime-logical-columns", String(cols));
    host.style.setProperty("--mha-runtime-logical-rows", String(logicalRows));
    host.dataset.accent = accent;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.iconShapeSetting = iconShapeSetting;
    document.documentElement.dataset.iconShape = iconShape;
  }

  function mountRenderShell({ layoutMode, layout, cols, units }) {
    destroyDomSubtree(host.shadowRoot);
    host.shadowRoot.innerHTML = createCriticalBootStyle() + createFrontendStyleLinks(
      styleManifest,
      {
        frontendRootUrl,
        frontendVersion,
      },
    );
    const links = [...host.shadowRoot.querySelectorAll('link[rel="stylesheet"]')];
    const { bg, shell, grid } = createShell({
      layoutMode,
      layout,
      logicalColumns: cols,
      units,
      hideHaSidebar: host._hideHaSidebar,
      activePage: host._getActivePage(),
      onPageSelect: (id) => host._setActivePage(id),
    });
    host.shadowRoot.append(bg, shell);
    return { links, grid };
  }

  async function waitForStyles({ links, renderId }) {
    await Promise.all(links.map((link) => new Promise((resolve) => {
      if (link.sheet) {
        resolve();
        return;
      }
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", resolve, { once: true });
    })));
    if (!host.isConnected || host._renderId !== renderId) return false;
    host._stylesReadyRenderId = renderId;
    return true;
  }

  async function render() {
    const context = buildRenderContext(host._themeController.read());
    prepareRenderCycle(context);
    applyRenderDatasetsAndRuntimeVars(context);
    const { links, grid } = mountRenderShell(context);
    appendWidgetPlaceholders(grid, context);
    appendPrimaryControls();
    appendDeferredUi(context);
    startProgressiveWidgetRender({ grid, ...context });
    const stylesReady = await waitForStyles(context);
    if (!stylesReady) return;
    host._syncRuntimeLayoutAttrs();
  }

  return {
    render,
    createWidgetPlaceholder,
  };
}
