import { writeStorageValue } from "../core/storage.js";
import { DOCK_POSITION, normalizeDockPosition } from "../core/mha-persistence.js";
import { syncDockActiveState } from "./dock-controller.js";

export function createResponsiveDockCoordinator(host) {
  function syncStatusBarFillScrollState(scrolled = false) {
    host.classList.toggle("mha-is-scrolled", Boolean(scrolled));
  }

  function isMobileLauncherLayout() {
    return host._getRuntimeLayout?.() === "mobile"
      || host._layout === "mobile"
      || host.dataset.layout === "mobile";
  }

  function isMobileLandscapeLayout() {
    return isMobileLauncherLayout()
      && window.matchMedia?.("(orientation: landscape)")?.matches;
  }

  function updateDockActiveState() {
    syncDockActiveState(host.shadowRoot, host._activePageId);
  }

  function syncDocksDom() {
    return host._pageUiCoordinator.syncDocks();
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
    host._isResponsiveRelayouting = true;
    host.classList.add("is-responsive-relayouting");
    clearTimeout(host._relayoutTimer);
    cancelAnimationFrame(host._viewportRaf);
    host._viewportRaf = requestAnimationFrame(() => {
      host._syncGridRuntimeMetrics();
      host._observeLayoutSize();
      wireDockAutoHide(host.shadowRoot?.querySelector?.(".mha-grid"));
      host._syncEditModeDom();
      host._syncWidgetDropSlots();
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

    const scrollContainer = grid.closest(".mha-widget-area");
    const isMobileLayout = () => host.dataset.layout === "mobile";
    const isLandscape = () => window.matchMedia?.("(orientation: landscape)")?.matches;

    if (!scrollContainer || !isMobileLayout()) return;
    if (isLandscape()) {
      host.classList.add("is-dock-hidden");
      host.classList.add("is-mobile-floating-controls-hidden");
      return;
    }

    let previousScrollTop = scrollContainer.scrollTop;
    syncStatusBarFillScrollState(previousScrollTop > 4);
    const threshold = 10;
    const onScroll = () => {
      if (!isMobileLayout() || isLandscape()) {
        host.classList.toggle("is-dock-hidden", isMobileLayout() && isLandscape());
        host.classList.toggle(
          "is-mobile-floating-controls-hidden",
          isMobileLayout() && isLandscape(),
        );
        syncStatusBarFillScrollState(false);
        previousScrollTop = scrollContainer.scrollTop;
        return;
      }

      const currentScrollTop = scrollContainer.scrollTop;
      syncStatusBarFillScrollState(currentScrollTop > 4);
      if (currentScrollTop <= 4) {
        host.classList.remove("is-dock-hidden");
        host.classList.remove("is-mobile-floating-controls-hidden");
        previousScrollTop = currentScrollTop;
        return;
      }

      const delta = currentScrollTop - previousScrollTop;
      if (delta > threshold) {
        host.classList.add("is-dock-hidden", "is-mobile-floating-controls-hidden");
      } else if (delta < -threshold) {
        host.classList.remove("is-dock-hidden", "is-mobile-floating-controls-hidden");
      }

      if (Math.abs(delta) > threshold) previousScrollTop = currentScrollTop;
    };

    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    host._gridScrollCleanup = () => scrollContainer.removeEventListener("scroll", onScroll);
  }

  return {
    isMobileLauncherLayout,
    isMobileLandscapeLayout,
    updateDockActiveState,
    syncDocksDom,
    applyDockPositionFromSettings,
    handleViewportChange,
    clearGridScrollListener,
    wireDockAutoHide,
  };
}
