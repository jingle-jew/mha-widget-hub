import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import {
  createCriticalBootStyleElement,
  createFrontendStyleElements,
} from "../core/mha-frontend-assets.js";
import { getMediaArtworkUrl } from "../ha/media.js";
import {
  getAvailableMediaPlayers,
  resolveEnabledMediaPlayers,
  resolveSelectedMediaPlayerId,
} from "../ha/media-players.js";
import { t } from "../i18n/index.js";
import { createMobileDock } from "./mobile-dock.js";
import { createIosOrganicWallpaper } from "./ios-organic-wallpaper.js?v=ios-wallpaper-svg-1";
import { createShell } from "./shell.js?v=ios-wallpaper-svg-1";
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
import { createPagePanel } from "../pages/page-panel.js";
import { createMediaPage } from "../pages/media-page.js";
import { syncMediaPageSettingsPanel } from "../pages/media-page-settings.js";
import { isMediaPageExperienceActive, isWeatherPage } from "../pages/page-types.js";
import { WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID } from "../pages/weather-page-widget-catalog.js";
import {
  captureSettingsPanelsUiState,
  restoreSettingsPanelsUiState,
} from "../settings/settings-panel-orchestrator.js";
import { getPrimaryEditIconName, setFloatingControlButtonIcon } from "../ui/floating-control-icons.js";
import {
  applyWidgetSurfaceHostLayoutState,
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  createPageCreatorPanel,
  createWidgetConfigPanel,
  createWidgetManagerPanel,
  syncWidgetSurfaceOpenState,
} from "../widgets/widget-placement-orchestrator.js";

const STYLE_SETTLE_TIMEOUT_MS = 900;

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

function setHostRenderState(host, state = "ready") {
  if (host?.dataset) host.dataset.renderState = state;
}

function clampMediaPageSidebarRows(value, {
  min = 5,
  max = 12,
} = {}) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || min)));
}

function getMediaPageBootstrapPreset({
  layout = "desktop",
  layoutVariant = "desktop-landscape",
  viewport = {},
} = {}) {
  const viewportHeight = Math.max(0, Number(viewport?.height) || 0);
  const isMobileLandscape = layoutVariant === "mobile-landscape";
  const targetCell = layout === "mobile"
    ? (isMobileLandscape ? 68 : 82)
    : (layout === "tablet" ? 90 : 96);
  const minRows = layout === "mobile" ? (isMobileLandscape ? 4 : 6) : 5;
  const maxRows = layout === "mobile" ? (isMobileLandscape ? 8 : 14) : 12;
  const estimatedPanelHeight = viewportHeight * (
    layout === "mobile"
      ? (isMobileLandscape ? 0.52 : 0.44)
      : 0.72
  );

  return {
    columns: 4,
    rows: clampMediaPageSidebarRows(
      estimatedPanelHeight > 0 ? estimatedPanelHeight / targetCell : 8,
      { min: minRows, max: maxRows },
    ),
    density: "media-page-sidebar",
  };
}

function ensureIosOrganicWallpaperNode(background) {
  if (!background?.querySelector) return;
  if (background.querySelector(".mha-ios-organic-wallpaper")) return;

  const wallpaperImage = background.querySelector(".mha-background-wallpaper");
  const svg = createIosOrganicWallpaper();

  if (wallpaperImage?.parentNode === background) {
    if (typeof background.insertBefore === "function") {
      background.insertBefore(svg, wallpaperImage);
      return;
    }

    svg.parentNode = background;
    if (Array.isArray(background.appended)) {
      const imageIndex = background.appended.indexOf(wallpaperImage);
      const targetIndex = imageIndex >= 0 ? imageIndex : background.appended.length;
      background.appended.splice(targetIndex, 0, svg);
    }
    if (Array.isArray(background.childNodes)) {
      const imageIndex = background.childNodes.indexOf(wallpaperImage);
      const targetIndex = imageIndex >= 0 ? imageIndex : background.childNodes.length;
      background.childNodes.splice(targetIndex, 0, svg);
    }
    return;
  }

  background.append(svg);
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
    themeStyle = host?.dataset?.themeStyle || "",
  } = {}) {
    const isMediaPage = isMediaPageExperienceActive(
      activePage,
      themeStyle,
    );
    host.dataset.activePageType = activePage?.type || "grid";
    host.dataset.mediaPageActive = String(isMediaPage);
    host.dataset.mediaPageBackgroundBlur = String(isMediaPage && blurBackground);

    const resolvedArtworkUrl = artworkUrl || resolveMediaPageArtworkUrl(activePage);

    if (isMediaPage && resolvedArtworkUrl) {
      clearTimeout(host._mediaPageWallpaperClearTimer || 0);
      host._mediaPageWallpaperClearTimer = 0;
      host.dataset.mediaPageWallpaper = "true";
      host.style?.setProperty?.("--mha-media-page-wallpaper-image", `url("${resolvedArtworkUrl}")`);
      return;
    }

    host.dataset.mediaPageWallpaper = "false";
    clearTimeout(host._mediaPageWallpaperClearTimer || 0);
    if (host._pageTypeWallpaperCrossfadeActive) {
      host._mediaPageWallpaperClearTimer = setTimeout(() => {
        host._mediaPageWallpaperClearTimer = 0;
        if (host.dataset.mediaPageWallpaper === "true") return;
        host.style?.removeProperty?.("--mha-media-page-wallpaper-image");
      }, host._pageTypeWallpaperCrossfadeDurationMs || 480);
      return;
    }
    host.style?.removeProperty?.("--mha-media-page-wallpaper-image");
  }

  function resolveMediaPageArtworkUrl(activePage = getActivePage(host)) {
    if (!activePage) return "";

    const availablePlayers = getAvailableMediaPlayers(host._hass, host._entityVisibilityConfig);
    const enabledPlayers = resolveEnabledMediaPlayers(activePage?.config, availablePlayers);
    const selectedPlayerId = resolveSelectedMediaPlayerId(activePage?.config, enabledPlayers);
    const entity = selectedPlayerId ? host._hass?.states?.[selectedPlayerId] || null : null;
    return getMediaArtworkUrl(entity);
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
    const batchSize = layout === "mobile" ? 1 : 2;

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
    addWidget.dataset.dragDelete = "false";
    setFloatingControlButtonIcon(addWidget, {
      name: "plus",
      label: t("settings.addWidget", "Add widget"),
    });
    addWidget.hidden = !host._isEditing || host._canAddWidgetToActivePage?.() === false;
    addWidget.onclick = (event) => {
      if (addWidget.dataset.dragDelete === "true") return;
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

      host.shadowRoot.append(host._screensaverCoordinator.createDomElement());
      host._syncSettingsDom?.();
      restoreSettingsPanelsUiState(host.shadowRoot, host._settingsPanelsUiState);
      host._settingsPanelsUiState = null;
      const widgetManagerWeatherScoped = isWeatherPage(host._getActivePage?.());
      host.shadowRoot.append(applyWidgetSurfaceHostLayoutState(host.shadowRoot, createWidgetManagerPanel(buildWidgetManagerPanelProps({
        open: host._widgetManagerOpen,
        activeCategory: host._widgetManagerCategory || (widgetManagerWeatherScoped ? WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID : ""),
        categories: host._getWidgetManagerCategories?.() || [],
        singleCategory: widgetManagerWeatherScoped,
        emptyLabel: widgetManagerWeatherScoped ? t("widgets.weatherManager.empty", "No weather widgets available for this integration.") : "",
        onClose: () => host._closeWidgetManager(),
        onBack: () => host._showWidgetManagerCategories(),
        onSelectCategory: (id) => host._selectWidgetManagerCategory(id),
        onSelectWidget: (item) => host._beginWidgetPlacement(item),
      }))));
      host.shadowRoot.append(applyWidgetSurfaceHostLayoutState(
        host.shadowRoot,
        createPageCreatorPanel(host._pageUiCoordinator.buildPageCreatorProps()),
      ));
      syncMediaPageSettingsPanel(host.shadowRoot, host._buildMediaPageSettingsProps?.() || {});
      host.shadowRoot.append(applyWidgetSurfaceHostLayoutState(
        host.shadowRoot,
        createWidgetConfigPanel(buildWidgetConfigPanelProps({
          session: host._widgetConfigSession,
          hass: host._hass,
          visibilityConfig: host._entityVisibilityConfig,
          onCancel: () => host._closeWidgetConfig(),
          onSave: () => host._saveWidgetConfig(),
          onRerender: () => host._syncWidgetConfigDom(),
        })),
      ));
      syncWidgetSurfaceOpenState(host.shadowRoot);
      host._syncEditModeDom();
      host._syncScreensaverVisibilityState();
      host._scheduleIconSymbolRefresh();
    });
  }

  function buildRenderContext(themeState) {
    const viewport = getShellViewportMetrics(host);
    const responsiveState = host._getResponsiveState?.({ viewportMetrics: viewport }) || {};
    const layoutMode = responsiveState.layoutMode || host._getRuntimeLayoutMode?.() || getLayoutMode(host);
    const layout = responsiveState.layout
      || host._getRuntimeLayout?.()
      || getLayoutForWidth(viewport.width, { layoutMode });
    const gridOrientation = responsiveState.orientation
      || host._getGridOrientation?.()
      || getGridOrientation(viewport);
    const { themeStyle, iconShapeSetting, iconShape, accent } = themeState;
    const activePage = getActivePage(host);
    const preset = isMediaPageExperienceActive(activePage, themeStyle)
      ? getMediaPageBootstrapPreset({
        layout,
        layoutVariant: responsiveState.layoutVariant || `${layout}-${gridOrientation}`,
        viewport,
      })
      : (
        host._getRuntimeGridPreset?.()
        || host._getLogicalGridPreset?.()
        || getGridPresetForLayout(layout, gridOrientation)
      );
    const units = getInternalGridColumnCountFromLogical(preset.columns);
    const rows = getInternalGridRowCountFromLogical(preset.rows);
    const cols = preset.columns;
    const logicalRows = preset.rows;
    return {
      renderId: host._renderId + 1,
      themeState,
      responsiveState,
      layoutMode,
      layout,
      layoutVariant: responsiveState.layoutVariant || `${layout}-${gridOrientation}`,
      dockFamily: responsiveState.dockFamily || (layout === "mobile" ? "bottom" : "side"),
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
      statusBarMode: responsiveState.effectiveStatusBarMode || host._statusBarMode || "pill",
      statusBarVisible: responsiveState.statusBarVisible ?? (layout !== "mobile"),
    };
  }

  function prepareRenderCycle({ renderId, themeState }) {
    const skipStabilizingRender = Boolean(host._skipStabilizingRenderOnce);
    host._skipStabilizingRenderOnce = false;
    host._applyCustomWallpaperState(themeState);
    host._applyHaSidebarMode(host._hideHaSidebar);
    syncMediaPageBackdropState({ themeStyle: themeState?.themeStyle || "" });
    host._renderId = renderId;
    cancelAnimationFrame(host._widgetRenderFrame);
    cancelAnimationFrame(host._secondaryUiFrame);
    host._clearGridScrollListener();
    host._clearTouchEditLongPress?.();
    host._stylesReadyRenderId = 0;
    host.dataset.widgetsState = "pending";
    setHostRenderState(
      host,
      host._bootComplete
        ? (skipStabilizingRender ? "ready" : "stabilizing")
        : "booting",
    );
  }

  function applyRenderDatasetsAndRuntimeVars({
    themeStyle,
    iconShapeSetting,
    iconShape,
    layoutMode,
    layout,
    layoutVariant,
    dockFamily,
    gridOrientation,
    preset,
    units,
    rows,
    cols,
    logicalRows,
    accent,
    statusBarMode,
    statusBarVisible,
  }) {
    host.dataset.themeStyle = themeStyle;
    host.dataset.iconShapeSetting = iconShapeSetting;
    host.dataset.iconShape = iconShape;
    host.dataset.layoutMode = layoutMode;
    host.dataset.layout = layout;
    host.dataset.layoutFamily = layout;
    host.dataset.layoutVariant = layoutVariant;
    host.dataset.dockFamily = dockFamily;
    if (gridOrientation) {
      host.dataset.gridOrientation = gridOrientation;
    } else {
      delete host.dataset.gridOrientation;
    }
    host.dataset.dockPosition = layoutVariant === "mobile-landscape"
      ? "left"
      : host._dockPosition;
    host.dataset.dockLabels = String(Boolean(host._showDockLabels));
    host.dataset.statusBarMode = statusBarMode || "pill";
    host.dataset.statusBarVisible = String(Boolean(statusBarVisible));
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

  function createMediaPagePanel(page = {}) {
    const mediaPageProps = host._buildMediaPageProps?.() || {};
    const externalBackdropSync = mediaPageProps.onBackgroundArtworkChange;
    const content = createMediaPage(page, {
      ...mediaPageProps,
      onBackgroundArtworkChange: (artworkUrl, options = {}) => {
        const activePage = getActivePage(host);
        if (activePage?.id !== page?.id) return;
        externalBackdropSync?.(artworkUrl, options);
        syncMediaPageBackdropState({
          activePage: page,
          artworkUrl,
          blurBackground: options.blurBackground,
          themeStyle: host.dataset.themeStyle || "",
        });
      },
    });
    const panel = createPagePanel({
      page,
      kind: "media",
      content,
    });
    panel.classList.add("mha-page-panel--media");
    return { panel, content };
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

  function mountRenderShell({ layoutMode, layout, cols, units, statusBarMode = "top-bar" }) {
    const persistentBackground = host.shadowRoot?.querySelector?.(".mha-background") || null;
    host._settingsPanelsUiState = captureSettingsPanelsUiState(host.shadowRoot);
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
      statusBarMode,
      ...dockProps,
    });
    const background = persistentBackground || bg;
    ensureIosOrganicWallpaperNode(background);
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
    if (isMediaPageExperienceActive(activePage, host.dataset.themeStyle || "")) {
      const mediaPanel = createMediaPagePanel(activePage);
      grid = mediaPanel.content?.__mhaGrid || mediaPanel.content?.querySelector?.(".mha-grid") || null;
      pageStage.append(mediaPanel.panel);
      if (grid?.dataset) grid.dataset.pageType = activePage?.type || "media-players";
      if (grid) {
        appendWidgetPlaceholders(grid, {
          units,
          rows,
          layout,
          positions,
        });
      }
      activeSurface = mediaPanel.content;
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
    if (!grid) {
      host.dataset.widgetsState = "ready";
      host._scheduleHassUpdate();
      host._syncEditModeDom?.();
      host._syncWidgetDropSlots?.();
      host._scheduleIconSymbolRefresh?.();
      return;
    }
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
      setHostRenderState(host, "ready");
      return;
    }
    host._pendingDeferredUi = { layout, renderId };
    host._tryCompleteBoot();
  }

  function handleStylesError({ layout, renderId, error }) {
    console.warn("[MHA] Styles did not finish loading; revealing the shell.", error);
    if (host._bootComplete) {
      appendDeferredUi({ layout, renderId });
      setHostRenderState(host, "ready");
      return;
    }
    host._pendingDeferredUi = { layout, renderId };
    host._finishBoot({ fallback: true, reason: "stylesheet initialization failed" });
  }

  function awaitStylesAndFinalizeRender({
    links,
    layout,
    renderId,
    styleSettleTimeoutMs = STYLE_SETTLE_TIMEOUT_MS,
    setTimeoutRef = setTimeout,
    clearTimeoutRef = clearTimeout,
  }) {
    return new Promise((resolve) => {
      let settled = false;
      let settleTimer = 0;

      const settleWith = (handler, detail) => {
        if (settled) return;
        settled = true;
        clearTimeoutRef(settleTimer);
        Promise.resolve(handler(detail)).finally(resolve);
      };

      const settleReady = () => settleWith(handleStylesReady, { layout, renderId });
      const settleError = (error) => settleWith(handleStylesError, { layout, renderId, error });

      try {
        const waitForLinks = Promise.all((links || []).map((link) => (
          link.sheet
            ? Promise.resolve()
            : new Promise((linkResolve) => {
              link.addEventListener("load", linkResolve, { once: true });
              link.addEventListener("error", linkResolve, { once: true });
            })
        )));

        settleTimer = setTimeoutRef(() => {
          settleError(new Error("stylesheet initialization timed out"));
        }, styleSettleTimeoutMs);

        waitForLinks.then(settleReady).catch(settleError);
      } catch (error) {
        settleError(error);
      }
    });
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
