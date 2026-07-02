import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import {
  createCriticalBootStyleElement,
  createFrontendStyleElements,
} from "../core/mha-frontend-assets.js";
import { t } from "../i18n/index.js";
import { createMobileDock } from "./mobile-dock.js";
import { createShell } from "./shell.js";
import {
  getGridOrientation,
  getGridPresetForLayout,
  getInternalGridColumnCountFromLogical,
  getInternalGridRowCountFromLogical,
  getLayoutMode,
  getWidgetDensity,
  normalizeWidgetForKind,
  sizeToString,
} from "./layout-engine.js";
import { getLayoutForWidth } from "./responsive.js";
import { createSettingsPanel } from "../settings/settings-panel.js";
import { createPagePanel } from "../pages/page-panel.js";
import { syncMediaPageSettingsPanel } from "../pages/media-page-settings.js";
import { isMediaPlayersPage } from "../pages/page-types.js";
import { getPrimaryEditIconName, setFloatingControlButtonIcon } from "../ui/floating-control-icons.js";
import {
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  createPageCreatorPanel,
  createWidgetConfigPanel,
  createWidgetManagerPanel,
  syncWidgetSurfaceOpenState,
} from "../widgets/widget-placement-orchestrator.js";

function getActivePage(host) {
  return host._getActivePage?.() || null;
}

function getShellViewportMetrics(host) {
  if (typeof host?._getShellViewportMetrics === "function") {
    return host._getShellViewportMetrics();
  }
  const rect = host?.getBoundingClientRect?.() || {};
  return {
    width: Math.max(0, Number(rect.width) || window.innerWidth || 0),
    height: Math.max(0, Number(rect.height) || window.innerHeight || 0),
  };
}

export function createRenderPipeline(host, options = {}) {
  const {
    frontendRootUrl,
    frontendVersion,
    styleManifest = [],
  } = options;

  function syncMediaPageBackdropState({
    activePage = getActivePage(host),
    artworkUrl = "",
    blurBackground = activePage?.config?.blurBackground !== false,
  } = {}) {
    const isMediaPage = isMediaPlayersPage(activePage);
    host.dataset.activePageType = activePage?.type || "grid";
    host.dataset.mediaPageActive = String(isMediaPage);
    host.dataset.mediaPageBackgroundBlur = String(isMediaPage && blurBackground);

    if (isMediaPage && artworkUrl) {
      host.dataset.mediaPageWallpaper = "true";
      host.style.setProperty("--mha-media-page-wallpaper-image", `url("${artworkUrl}")`);
      return;
    }

    host.dataset.mediaPageWallpaper = "false";
    host.style.removeProperty("--mha-media-page-wallpaper-image");
  }

  function createWidgetPlaceholder(widget, {
    units,
    rows,
    layout,
    position,
  }) {
    const size = normalizeWidgetForKind(widget, {
      units,
      rowUnits: rows,
      layout,
    });
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

  function appendWidgetPlaceholders(grid, {
    units,
    rows,
    layout,
    positions,
  }) {
    const fragment = document.createDocumentFragment();
    host._widgets.forEach((widget) => {
      const placeholder = Object.hasOwn(host, "_createWidgetPlaceholder")
        ? host._createWidgetPlaceholder(widget, {
          units,
          rows,
          layout,
          position: positions?.[widget.id],
        })
        : createWidgetPlaceholder(widget, {
          units,
          rows,
          layout,
          position: positions?.[widget.id],
        });
      fragment.append(placeholder);
    });
    grid.append(fragment);
    host.dataset.widgetsState = host._widgets.length ? "loading" : "ready";
  }

  function startProgressiveWidgetRender({
    grid,
    units,
    rows,
    layout,
    positions,
    renderId,
  }) {
    cancelAnimationFrame(host._widgetRenderFrame);
    const queue = [...host._widgets];
    const batchSize = (host._getRuntimeLayout?.() || host.dataset?.layout || "desktop") === "mobile" ? 1 : 2;

    const renderBatch = () => {
      host._widgetRenderFrame = 0;
      if (!host.isConnected || host._renderId !== renderId) return;

      const fragment = document.createDocumentFragment();
      const replacements = [];
      queue.splice(0, batchSize).forEach((widget) => {
        const placeholder = grid.querySelector(`[data-widget-placeholder-id="${widget.id}"]`);
        const el = host._createWidgetElement(widget, {
          units,
          rows,
          layout,
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
    edit.setAttribute("aria-label", t(host._isEditing ? "common.close" : "common.edit", host._isEditing ? "Close" : "Edit"));
    setFloatingControlButtonIcon(edit, {
      name: getPrimaryEditIconName(host._isEditing),
      label: t(host._isEditing ? "common.close" : "common.edit", host._isEditing ? "Close" : "Edit"),
    });
    edit.onclick = () => host.toggleEditMode();
    host.shadowRoot.append(edit);

    const addWidget = document.createElement("button");
    addWidget.className = "mha-edit-button mha-main-edit-button mha-add-widget-button";
    addWidget.type = "button";
    addWidget.setAttribute("aria-label", t("settings.addWidget", "Add widget"));
    setFloatingControlButtonIcon(addWidget, {
      name: "plus",
      label: t("settings.addWidget", "Add widget"),
    });
    addWidget.hidden = !host._isEditing || host._canAddWidgetToActivePage?.() === false;
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
      syncMediaPageSettingsPanel(host.shadowRoot, host._buildMediaPageSettingsProps?.() || {});
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
    const viewport = getShellViewportMetrics(host);
    const layoutMode = host._getRuntimeLayoutMode?.() || getLayoutMode(host);
    const layout = host._getRuntimeLayout?.()
      || getLayoutForWidth(viewport.width, { layoutMode });
    const gridOrientation = host._getGridOrientation?.()
      || getGridOrientation(viewport);
    const preset = host._getLogicalGridPreset?.()
      || getGridPresetForLayout(layout, gridOrientation);
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
      gridOrientation,
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
    syncMediaPageBackdropState();
    host._renderId = renderId;
    cancelAnimationFrame(host._widgetRenderFrame);
    cancelAnimationFrame(host._secondaryUiFrame);
    host._clearGridScrollListener();
    host._clearTouchEditLongPress?.();
    host._stylesReadyRenderId = 0;
    host.dataset.widgetsState = "pending";
  }

  function applyRenderDatasetsAndRuntimeVars({
    themeStyle,
    iconShapeSetting,
    iconShape,
    layoutMode,
    layout,
    gridOrientation,
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
    if (gridOrientation) {
      host.dataset.gridOrientation = gridOrientation;
    } else {
      delete host.dataset.gridOrientation;
    }
    host.dataset.dockPosition = host._dockPosition;
    host.dataset.dockLabels = String(Boolean(host._showDockLabels));
    host.classList.toggle("is-editing", host._isEditing);
    host.dataset.accent = accent;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.iconShapeSetting = iconShapeSetting;
    document.documentElement.dataset.iconShape = iconShape;
  }

  function createGridPanel(page = {}) {
    const grid = document.createElement("section");
    grid.className = "mha-grid";
    grid.setAttribute("aria-label", t("settings.widgetGrid", "Widget grid"));
    const panel = createPagePanel({
      page,
      kind: "grid",
      content: grid,
    });
    panel.classList.add("mha-page-panel--grid");
    return { panel, grid };
  }

  function syncShellBackgroundSurface(bg) {
    if (!bg?.style) return;

    const wallpaperNode = bg.querySelector?.(".mha-background-wallpaper");
    const activeWallpaper = host._activeWallpaper || null;
    const wallpaperKind = String(activeWallpaper?.kind || host.dataset.wallpaperKind || "none");
    const wallpaperSource = String(activeWallpaper?.source || host.dataset.wallpaperSource || "");
    const wallpaperImageUrl = String(activeWallpaper?.renderValue || activeWallpaper?.value || "");
    const wallpaperBackground = host.style.getPropertyValue("--mha-active-wallpaper-background").trim();
    const hasImageWallpaper = wallpaperKind === "image" && Boolean(wallpaperImageUrl);
    const hasCssWallpaper = wallpaperKind === "css" && Boolean(wallpaperBackground);
    const shouldUseImageWallpaper = hasImageWallpaper && (
      wallpaperSource === "custom" || wallpaperSource === "theme"
    );
    const shouldUseCssWallpaper = hasCssWallpaper && wallpaperSource === "theme";

    if (wallpaperNode) {
      wallpaperNode.hidden = !hasImageWallpaper;
      if (shouldUseImageWallpaper) {
        const currentSrc = String(
          wallpaperNode.getAttribute?.("src")
            || wallpaperNode.src
            || "",
        );
        if (currentSrc !== wallpaperImageUrl) {
          wallpaperNode.src = wallpaperImageUrl;
        }
      } else if (wallpaperNode.getAttribute?.("src") || wallpaperNode.src) {
        wallpaperNode.removeAttribute("src");
      }
    }

    if (!shouldUseCssWallpaper) {
      bg.style.removeProperty("background-image");
      bg.style.removeProperty("background-size");
      bg.style.removeProperty("background-position");
      bg.style.removeProperty("background-repeat");
      bg.style.removeProperty("background");
    }

    if (shouldUseImageWallpaper) {
      return;
    }

    if (shouldUseCssWallpaper && bg.style.background !== wallpaperBackground) {
      bg.style.background = wallpaperBackground;
    }
  }

  function mountRenderShell({ layoutMode, layout, cols, units }) {
    const persistentBackground = host.shadowRoot?.querySelector?.(".mha-background") || null;
    if (persistentBackground) {
      const removableChildren = [
        ...host.shadowRoot.childNodes || [],
      ].filter(node => node !== persistentBackground);
      removableChildren.forEach((node) => {
        destroyDomSubtree(node);
        node.remove?.();
      });
    } else {
      destroyDomSubtree(host.shadowRoot);
      host.shadowRoot.innerHTML = "";
    }

    const criticalBootStyle = createCriticalBootStyleElement(host.ownerDocument || document);
    const links = createFrontendStyleElements(
      styleManifest,
      {
        frontendRootUrl,
        frontendVersion,
      },
      host.ownerDocument || document,
    );
    host.shadowRoot.append(criticalBootStyle, ...links);
    const dockProps = host._getDockProps();
    const { bg, shell, pageStage } = createShell({
      layoutMode,
      layout,
      logicalColumns: cols,
      gridUnits: units,
      ...dockProps,
    });
    const background = persistentBackground || bg;
    syncShellBackgroundSurface(background);
    if (!persistentBackground) host.shadowRoot.append(background);
    host.shadowRoot.append(shell);
    return { links, pageStage };
  }

  function mountImmediateUi({ layout, pageStage, units, rows }) {
    const activePage = getActivePage(host);
    const positions = host._getActiveWidgetPositions({ create: true });
    let grid = null;
    let activeSurface = null;
    if (!pageStage) return { positions, grid, activeSurface };
    const gridPanel = createGridPanel(activePage);
    grid = gridPanel.grid;
    pageStage.append(gridPanel.panel);
    if (grid.dataset) grid.dataset.pageType = activePage?.type || "grid";
    appendWidgetPlaceholders(grid, {
      units,
      rows,
      layout,
      positions,
    });
    activeSurface = grid;
    if (layout === "mobile") {
      host.shadowRoot.append(createMobileDock(host._getDockProps()));
      host._scheduleMobileDockOverflowState?.();
    }
    appendPrimaryControls();
    host._wireDockAutoHide(activeSurface);
    host._wireTouchEditLongPress?.(grid);
    host._updateStatusDom?.();
    return { positions, grid, activeSurface };
  }

  function schedulePrimaryWidgetRender({
    grid,
    units,
    rows,
    layout,
    positions,
    renderId,
  }) {
    host._widgetRenderFrame = requestAnimationFrame(() => {
      host._widgetRenderFrame = 0;
      if (host._renderId !== renderId) return;
      startProgressiveWidgetRender({
        grid,
        units,
        rows,
        layout,
        positions,
        renderId,
      });
    });
  }

  function handleStylesReady({ layout, renderId }) {
    if (host._renderId !== renderId) return;
    host._stylesReadyRenderId = renderId;
    host._observeLayoutSize();
    host._scheduleMobileDockOverflowState?.();
    host._scheduleIconSymbolRefresh();
    if (host._bootComplete) {
      appendDeferredUi({ layout, renderId });
      return;
    }
    host._pendingDeferredUi = { layout, renderId };
    host._tryCompleteBoot();
  }

  function handleStylesError({ layout, renderId, error }) {
    console.warn("[MHA] Styles did not finish loading; revealing the shell.", error);
    if (host._bootComplete) {
      appendDeferredUi({ layout, renderId });
      return;
    }
    host._pendingDeferredUi = { layout, renderId };
    host._finishBoot({ fallback: true, reason: "stylesheet initialization failed" });
  }

  function awaitStylesAndFinalizeRender({ links, layout, renderId }) {
    return Promise.all(links.map((link) => (
      link.sheet
        ? Promise.resolve()
        : new Promise((resolve) => {
          link.addEventListener("load", resolve, { once: true });
          link.addEventListener("error", resolve, { once: true });
        })
    )))
      .then(() => handleStylesReady({ layout, renderId }))
      .catch((error) => handleStylesError({ layout, renderId, error }));
  }

  function render() {
    const themeState = host._themeController.sync();
    const context = buildRenderContext(themeState);
    prepareRenderCycle(context);
    applyRenderDatasetsAndRuntimeVars(context);
    const { links, pageStage } = mountRenderShell(context);
    const { positions, grid } = mountImmediateUi({ ...context, pageStage });
    schedulePrimaryWidgetRender({
      grid,
      units: context.units,
      rows: context.rows,
      layout: context.layout,
      positions,
      renderId: context.renderId,
    });
    awaitStylesAndFinalizeRender({
      links,
      layout: context.layout,
      renderId: context.renderId,
    });
    host._scheduleScreensaverIdleTimer();
  }

  return {
    render,
    createWidgetPlaceholder,
    appendDeferredUi,
    handleStylesReady,
    handleStylesError,
    awaitStylesAndFinalizeRender,
    buildRenderContext,
    prepareRenderCycle,
    applyRenderDatasetsAndRuntimeVars,
    mountRenderShell,
    mountImmediateUi,
    schedulePrimaryWidgetRender,
    startProgressiveWidgetRender,
    appendWidgetPlaceholders,
    appendPrimaryControls,
  };
}
