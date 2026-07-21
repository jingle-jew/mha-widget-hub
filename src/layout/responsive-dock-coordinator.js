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

  function getStandardDockScrollContainer() {
    return host.shadowRoot?.querySelector?.(".mha-dock") || null;
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

  function isVerticalDockAutoScrollLayout() {
    const responsiveState = getResponsiveState();
    if (responsiveState?.dockFamily) {
      return responsiveState.dockFamily === "side"
        && (
          responsiveState.layout !== "mobile"
          || responsiveState.layoutVariant === "mobile-landscape"
        );
    }

    return isMobileLandscapeLayout() || !isMobileLauncherLayout();
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

  function scheduleStandardDockEditScroll() {
    cancelAnimationFrame(host._standardDockEditScrollFrame || 0);
    host._standardDockEditScrollFrame = requestAnimationFrame(() => {
      host._standardDockEditScrollFrame = 0;
      const dock = getStandardDockScrollContainer();
      if (!dock) return;
      if (!isVerticalDockAutoScrollLayout()) return;
      if (!host._isEditing || host._activeMoveWidgetId || host._pendingWidgetPlacement) return;
      if (dock.scrollHeight <= dock.clientHeight + 1) return;
      const maxScrollTop = Math.max(0, dock.scrollHeight - dock.clientHeight);
      if (typeof dock.scrollTo === "function") {
        dock.scrollTo({
          top: maxScrollTop,
          behavior: "smooth",
        });
        return;
      }
      dock.scrollTop = maxScrollTop;
    });
  }

  function syncMobileDockEditScroll() {
    const isEditing = Boolean(host._isEditing);
    const enteredEditMode = !host._wasMobileDockEditing && isEditing;
    host._wasMobileDockEditing = isEditing;
    if (!enteredEditMode) return false;
    if (host._activeMoveWidgetId || host._pendingWidgetPlacement) return false;

    if (isMobileLauncherLayout() && !isMobileLandscapeLayout()) {
      scheduleMobileDockEditScroll();
      return true;
    }

    if (isVerticalDockAutoScrollLayout()) {
      scheduleStandardDockEditScroll();
      return true;
    }

    return false;
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

  function scheduleMediaPageScrollReset() {
    if (host.dataset?.mediaPageActive !== "true") return false;
    const responsiveState = host._responsiveState || getResponsiveState();
    if (responsiveState?.layout !== "mobile") return false;

    const reset = () => {
      const mediaPage = host.shadowRoot?.querySelector?.(".mha-media-page");
      if (!mediaPage) return;
      if (typeof mediaPage.__mhaResetScrollPosition === "function") {
        mediaPage.__mhaResetScrollPosition();
        return;
      }
      mediaPage.scrollTop = 0;
    };

    cancelAnimationFrame(host._mediaPageScrollResetFrame || 0);
    clearTimeout(host._mediaPageScrollResetTimer || 0);
    host._mediaPageScrollResetFrame = requestAnimationFrame(() => {
      host._mediaPageScrollResetFrame = 0;
      reset();
      host._mediaPageScrollResetTimer = setTimeout(reset, 140);
    });
    return true;
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
      const mediaPageOrientationChanged = Boolean(
        previousResponsiveState
        && nextResponsiveState
        && previousResponsiveState.layout === "mobile"
        && nextResponsiveState.layout === "mobile"
        && previousResponsiveState.layoutVariant !== nextResponsiveState.layoutVariant
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
      if (mediaPageOrientationChanged) scheduleMediaPageScrollReset();
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
    const mediaPage = grid?.classList?.contains?.("mha-media-page")
      ? grid
      : host.shadowRoot?.querySelector?.(".mha-media-page");
    if (mediaPage?.__mhaSyncMobileDockState) {
      mediaPage.__mhaSyncMobileDockState();
      return;
    }
    if (!grid) return;

    const widgetArea = grid.closest(".mha-widget-area");
    const isMobileLayout = () => isMobileLauncherLayout();
    const isLandscape = () => isMobileLandscapeLayout();
    const isWeatherBottomDockLayout = () => (
      !isMobileLayout()
      && host.dataset?.activePageType === "weather"
      && host.dataset?.dockPosition === "bottom"
    );

    if (!widgetArea || (!isMobileLayout() && !isWeatherBottomDockLayout())) return;
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
      const mobileLayout = isMobileLayout();
      const weatherBottomDockLayout = isWeatherBottomDockLayout();
      if ((!mobileLayout && !weatherBottomDockLayout) || isLandscape()) {
        host.classList.toggle(
          "is-mobile-floating-controls-hidden",
          mobileLayout && isLandscape(),
        );
        host.classList.remove("is-dock-hidden");
        syncStatusBarFillScrollState(false);
        previousScrollTop = getScrollTop();
        return;
      }

      const currentScrollTop = getScrollTop();
      syncStatusBarFillScrollState(currentScrollTop > 4);
      if (currentScrollTop <= 4) {
        host.classList.remove("is-mobile-floating-controls-hidden", "is-dock-hidden");
        previousScrollTop = currentScrollTop;
        return;
      }

      const delta = currentScrollTop - previousScrollTop;
      if (delta > threshold) {
        if (weatherBottomDockLayout) host.classList.add("is-dock-hidden");
        else host.classList.add("is-mobile-floating-controls-hidden");
      } else if (delta < -threshold) {
        if (weatherBottomDockLayout) host.classList.remove("is-dock-hidden");
        else host.classList.remove("is-mobile-floating-controls-hidden");
      }

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
