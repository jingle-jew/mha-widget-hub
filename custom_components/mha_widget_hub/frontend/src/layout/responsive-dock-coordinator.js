import { writeStorageValue } from "../core/storage.js";
import { DOCK_POSITION, normalizeDockPosition } from "../core/mha-persistence.js";
import { syncDockActiveState } from "./dock-controller.js";

export function createResponsiveDockCoordinator(host) {
  function getResponsiveState({ publish = false } = {}) {
    if (typeof host._syncResponsiveState === "function") {
      return host._syncResponsiveState({ publish });
    }
    return host._responsiveState || null;
  }

  function getMobileDockScrollContainer() {
    const dock = host.shadowRoot?.querySelector?.(".mha-mobile-dock");
    if (!dock) return null;
    return dock.querySelector?.(".mha-mobile-dock-track") || dock;
  }

  function scheduleMobileDockOverflowState() {
    cancelAnimationFrame(host._mobileDockOverflowFrame || 0);
    host._mobileDockOverflowFrame = requestAnimationFrame(() => {
      host._mobileDockOverflowFrame = 0;
      syncMobileDockOverflowState();
    });
  }

  function syncMobileDockOverflowState() {
    const scrollContainer = getMobileDockScrollContainer();
    const dock = host.shadowRoot?.querySelector?.(".mha-mobile-dock");
    if (!dock || !scrollContainer) return false;
    if (!isMobileLauncherLayout() || isMobileLandscapeLayout()) {
      dock.dataset.overflowing = "false";
      return false;
    }
    const overflowing = scrollContainer.scrollWidth > scrollContainer.clientWidth + 1;
    dock.dataset.overflowing = String(overflowing);
    return overflowing;
  }

  function scheduleMobileDockEditScroll() {
    cancelAnimationFrame(host._mobileDockEditScrollFrame || 0);
    host._mobileDockEditScrollFrame = requestAnimationFrame(() => {
      host._mobileDockEditScrollFrame = 0;
      const dock = host.shadowRoot?.querySelector?.(".mha-mobile-dock");
      const scrollContainer = getMobileDockScrollContainer();
      if (!dock || !scrollContainer) return;
      syncMobileDockOverflowState();
      if (!isMobileLauncherLayout() || isMobileLandscapeLayout()) return;
      if (!host._isEditing || host._activeMoveWidgetId || host._pendingWidgetPlacement) return;
      if (scrollContainer.scrollWidth <= scrollContainer.clientWidth + 1) return;
      const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
      if (typeof scrollContainer.scrollTo === "function") {
        scrollContainer.scrollTo({
          left: maxScrollLeft,
          behavior: "smooth",
        });
        return;
      }
      scrollContainer.scrollLeft = maxScrollLeft;
    });
  }

  function syncMobileDockEditScroll() {
    const isEditing = Boolean(host._isEditing);
    const enteredEditMode = !host._wasMobileDockEditing && isEditing;
    host._wasMobileDockEditing = isEditing;
    if (!enteredEditMode) return false;
    if (!isMobileLauncherLayout() || isMobileLandscapeLayout()) return false;
    if (host._activeMoveWidgetId || host._pendingWidgetPlacement) return false;
    scheduleMobileDockEditScroll();
    return true;
  }

  function syncStatusBarFillScrollState(scrolled = false) {
    host.classList.toggle("mha-is-scrolled", Boolean(scrolled));
  }

  function isMobileLauncherLayout() {
    return getResponsiveState()?.layout === "mobile"
      || host._getRuntimeLayout?.() === "mobile";
  }

  function isMobileLandscapeLayout() {
    const responsiveState = getResponsiveState();
    if (responsiveState?.layoutVariant) {
      return responsiveState.layoutVariant === "mobile-landscape";
    }
    return isMobileLauncherLayout()
      && host._getGridOrientation?.() === "landscape";
  }

  function updateDockActiveState() {
    syncDockActiveState(host.shadowRoot, host._activePageId);
  }

  function syncDocksDom() {
    const result = host._pageUiCoordinator.syncDocks();
    scheduleMobileDockOverflowState();
    syncMobileDockEditScroll();
    return result;
  }

  function applyDockPositionFromSettings(position = "left") {
    const next = normalizeDockPosition(position);
    if (next === host._dockPosition) return;
    host._dockPosition = next;
    host._recordPersistenceResult(writeStorageValue(DOCK_POSITION, next));
    host.dataset.dockPosition = next;
    host.setAttribute("data-dock-position", next);
    host._syncSettingsDom();
    handleViewportChange();
  }

  function handleViewportChange() {
    const previousResponsiveState = host._responsiveState;
    host._isResponsiveRelayouting = true;
    host.classList.add("is-responsive-relayouting");
    clearTimeout(host._relayoutTimer);
    cancelAnimationFrame(host._viewportRaf);
    host._viewportRaf = requestAnimationFrame(() => {
      const nextResponsiveState = getResponsiveState({ publish: true });
      const requiresStructuralRelayout = Boolean(
        previousResponsiveState
        && nextResponsiveState
        && (
          previousResponsiveState.layout !== nextResponsiveState.layout
          || previousResponsiveState.layoutVariant !== nextResponsiveState.layoutVariant
          || previousResponsiveState.dockFamily !== nextResponsiveState.dockFamily
          || previousResponsiveState.statusBarVisible !== nextResponsiveState.statusBarVisible
        )
      );

      if (requiresStructuralRelayout && typeof host.render === "function") {
        host.render();
      } else {
        host._syncGridRuntimeMetrics();
        host._observeLayoutSize();
        wireDockAutoHide(host.shadowRoot?.querySelector?.(".mha-grid"));
        host._syncEditModeDom();
        host._syncWidgetDropSlots();
      }
      host._relayoutTimer = setTimeout(() => {
        host._isResponsiveRelayouting = false;
        host.classList.remove("is-responsive-relayouting");
      }, 180);
    });
  }

  function clearGridScrollListener() {
    host._gridScrollCleanup?.();
    host._gridScrollCleanup = null;
    syncStatusBarFillScrollState(false);
  }

  function wireDockAutoHide(grid) {
    clearGridScrollListener();
    host.classList.remove("is-dock-hidden", "is-mobile-floating-controls-hidden");
    if (!grid) return;

    const widgetArea = grid.closest(".mha-widget-area");
    const isMobileLayout = () => isMobileLauncherLayout();
    const isLandscape = () => isMobileLandscapeLayout();

    if (!widgetArea || !isMobileLayout()) return;
    if (isLandscape()) {
      host.classList.add("is-mobile-floating-controls-hidden");
      return;
    }

    const scrollContainers = [host, widgetArea]
      .filter((container, index, containers) => (
        container?.addEventListener
        && containers.indexOf(container) === index
      ));
    const getScrollTop = () => Math.max(
      0,
      ...scrollContainers.map(container => Number(container?.scrollTop || 0)),
    );

    let previousScrollTop = getScrollTop();
    syncStatusBarFillScrollState(previousScrollTop > 4);
    const threshold = 10;
    const onScroll = () => {
      if (!isMobileLayout() || isLandscape()) {
        host.classList.toggle(
          "is-mobile-floating-controls-hidden",
          isMobileLayout() && isLandscape(),
        );
        syncStatusBarFillScrollState(false);
        previousScrollTop = getScrollTop();
        return;
      }

      const currentScrollTop = getScrollTop();
      syncStatusBarFillScrollState(currentScrollTop > 4);
      if (currentScrollTop <= 4) {
        host.classList.remove("is-mobile-floating-controls-hidden");
        previousScrollTop = currentScrollTop;
        return;
      }

      const delta = currentScrollTop - previousScrollTop;
      if (delta > threshold) host.classList.add("is-mobile-floating-controls-hidden");
      else if (delta < -threshold) host.classList.remove("is-mobile-floating-controls-hidden");

      if (Math.abs(delta) > threshold) previousScrollTop = currentScrollTop;
    };

    scrollContainers.forEach(container => container.addEventListener("scroll", onScroll, { passive: true }));
    host._gridScrollCleanup = () => scrollContainers.forEach(
      container => container.removeEventListener("scroll", onScroll),
    );
  }

  return {
    isMobileLauncherLayout,
    isMobileLandscapeLayout,
    scheduleMobileDockOverflowState,
    syncMobileDockOverflowState,
    syncMobileDockEditScroll,
    updateDockActiveState,
    syncDocksDom,
    applyDockPositionFromSettings,
    handleViewportChange,
    clearGridScrollListener,
    wireDockAutoHide,
  };
}
