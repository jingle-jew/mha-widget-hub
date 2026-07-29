import { routeHassUpdate } from "./hass-update-router.js";

const ACTIVITY_EVENT_TYPES = Object.freeze([
  "pointerdown",
  "touchstart",
  "keydown",
  "wheel",
  "scroll",
]);

const BOOT_REVEAL_MAX_WAIT_MS = 800;

export function handleRuntimeUserActivity(host, activityCoordinator) {
  host?._handleUserActivity?.();
  activityCoordinator?.markActive?.();
}

export function createBootLifecycleCoordinator(host) {
  function hasMountedApp() {
    if (Object.hasOwn(host, "_hasMountedApp") && typeof host._hasMountedApp === "function") {
      return host._hasMountedApp();
    }
    return Boolean(
      host.shadowRoot?.querySelector?.(".mha-background")
      && host.shadowRoot?.querySelector?.(".mha-shell")
      && (
        host.shadowRoot?.querySelector?.(".mha-page-stage")
        || host.shadowRoot?.querySelector?.(".mha-grid")
      ),
    );
  }

  function ensureMounted({ force = false, reason = "lifecycle recovery" } = {}) {
    if (!host.isConnected) return false;
    const interruptedWidgetRender = (
      host.dataset.widgetsState === "loading"
      && host._widgets.length > 0
      && !host._widgetRenderFrame
    );
    if (!force && hasMountedApp() && !interruptedWidgetRender) return false;
    try {
      host.render();
      return true;
    } catch (error) {
      console.error(`[MHA] Render recovery failed after ${reason}.`, error);
      finishBoot({ fallback: true, reason: `render recovery failed after ${reason}` });
      return false;
    }
  }

  function addConnectionListeners() {
    if (host._connectionListenersAttached) return;
    host._connectionListenersAttached = true;
    host._lifecycleRecoveryListener = (event) => {
      const panelPath = window.location.pathname.replace(/\/+$/, "");
      const isPanelReturn = (
        event?.type === "location-changed"
        && host._bootComplete
        && panelPath.endsWith("/mha-widget-hub")
      );
      const isPageRestore = event?.type === "pageshow" && Boolean(event.persisted);
      ensureMounted({
        force: isPanelReturn || isPageRestore,
        reason: event?.type || "lifecycle recovery",
      });
    };
    window.addEventListener("pageshow", host._lifecycleRecoveryListener);
    window.addEventListener("location-changed", host._lifecycleRecoveryListener);
  }

  function removeConnectionListeners() {
    if (!host._connectionListenersAttached) return;
    host._connectionListenersAttached = false;
    window.removeEventListener("pageshow", host._lifecycleRecoveryListener);
    window.removeEventListener("location-changed", host._lifecycleRecoveryListener);
    host._lifecycleRecoveryListener = null;
  }

  function updateFromHass({ force = false } = {}) {
    const activityState = host._getActivityCoordinator().read();
    if (activityState === "hidden") {
      host._hassReconcilePending = true;
      return { changedEntityIds: new Set(), updateCount: 0, deferred: true };
    }

    let result = { changedEntityIds: new Set(), updateCount: 0, deferred: false };
    if (activityState === "covered") {
      host._hassReconcilePending = true;
    } else {
      const forceReconcile = force || host._hassReconcilePending;
      result = routeHassUpdate({
        root: host.shadowRoot,
        previousHass: host._lastRoutedHass,
        nextHass: host._hass,
        force: forceReconcile,
      });
      host._lastRoutedHass = host._hass;
      host._hassReconcilePending = false;
    }
    host._screensaverCoordinator.requestNowBarCalendarEvents();
    host._syncScreensaverDom();
    return result;
  }

  function scheduleHassUpdate() {
    if (!host.isConnected || host._hassUpdateFrame) return;
    if (host._getActivityCoordinator().read() === "hidden") {
      host._hassReconcilePending = true;
      return;
    }
    host._hassUpdateFrame = requestAnimationFrame(() => {
      host._hassUpdateFrame = 0;
      updateFromHass();
    });
  }

  function finishBoot({ fallback = false, reason = "" } = {}) {
    if (host._bootComplete) return;
    host._bootComplete = true;
    clearTimeout(host._bootWatchdog);
    host._bootWatchdog = 0;
    cancelAnimationFrame(host._readyRaf);
    host._readyRaf = 0;
    if (fallback) {
      console.warn(`[MHA] Boot fallback: ${reason || "initialization exceeded the safety deadline"}. Showing the available interface.`);
      host.dataset.bootFallback = "true";
    }
    host.dataset.bootState = "ready";
    host.setAttribute("data-boot-state", "ready");
    host.dataset.renderState = "ready";
    host.setAttribute("data-render-state", "ready");
    host.dataset.ready = "true";
    host.setAttribute("data-ready", "true");
    host.classList.add("is-boot-revealing");
    const grid = host.shadowRoot?.querySelector?.(".mha-grid")
      || host.shadowRoot?.querySelector?.(".mha-page-panel");
    let revealFinished = false;
    const finishReveal = () => {
      if (revealFinished) return;
      revealFinished = true;
      clearTimeout(host._bootRevealTimer);
      host._bootRevealTimer = 0;
      host.classList.remove("is-boot-revealing");
      document.getElementById("mha-widget-hub-boot-style")?.remove();
      host._syncRuntimeActivity?.();
      host._updateDockActiveState?.();
      const pending = host._pendingDeferredUi;
      host._pendingDeferredUi = null;
      if (pending) host._appendDeferredUi(pending);
      host._scheduleIconSymbolRefresh();
    };
    const runtimeActivity = host._getActivityCoordinator?.().read?.() || "active";
    if (
      fallback
      || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
      || !grid
      || runtimeActivity === "covered"
      || runtimeActivity === "hidden"
    ) {
      requestAnimationFrame(finishReveal);
      return;
    }
    requestAnimationFrame(() => {
      const nextRuntimeActivity = host._getActivityCoordinator?.().read?.() || "active";
      if (nextRuntimeActivity === "covered" || nextRuntimeActivity === "hidden") {
        finishReveal();
        return;
      }
      const animations = grid.getAnimations?.()
        .filter((animation) => animation.effect?.getTiming?.().iterations !== Infinity) || [];
      if (!animations.length) {
        finishReveal();
        return;
      }
      host._bootRevealTimer = setTimeout(finishReveal, BOOT_REVEAL_MAX_WAIT_MS);
      Promise.allSettled(animations.map((animation) => animation.finished)).then(finishReveal);
    });
  }

  function startBootWatchdog() {
    clearTimeout(host._bootWatchdog);
    host._bootWatchdog = setTimeout(() => {
      if (host._bootComplete) return;
      try {
        host._syncGridRuntimeMetrics();
      } catch (error) {
        console.warn("[MHA] Boot fallback could not complete the layout sync.", error);
      }
      finishBoot({ fallback: true, reason: "UI initialization did not complete within 1200ms" });
    }, 1200);
  }

  function markReadyAfterPaint(renderId = host._renderId) {
    if (host._bootComplete) return;
    cancelAnimationFrame(host._readyRaf);
    host._readyRaf = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (host._renderId !== renderId || !host.isConnected) return;
      const retryLayoutSync = () => {
        host._readyRaf = requestAnimationFrame(() => {
          if (host._renderId !== renderId || !host.isConnected) return;
          markReadyAfterPaint(renderId);
        });
      };
      try {
        const runtime = host._syncGridRuntimeMetrics();
        if (runtime?.squareUnitSynced === false) {
          retryLayoutSync();
          return;
        }
      } catch (error) {
        console.warn("[MHA] Initial layout sync failed; continuing with the rendered shell.", error);
        finishBoot({ fallback: true, reason: "initial layout synchronization failed" });
        return;
      }
      host._readyRaf = requestAnimationFrame(() => {
        if (host._renderId !== renderId || !host.isConnected) return;
        finishBoot();
      });
    }));
  }

  function tryCompleteBoot() {
    if (host._bootComplete) return;
    if (host._stylesReadyRenderId !== host._renderId) return;
    markReadyAfterPaint(host._renderId);
  }

  function connectedCallback() {
    host._initialize();
    if (host._connectionActive) {
      ensureMounted({ reason: "duplicate connection callback" });
      scheduleHassUpdate();
      return;
    }
    host._connectionActive = true;
    const isReconnect = host._hasConnectedOnce;
    host._hasConnectedOnce = true;
    startBootWatchdog();
    addConnectionListeners();
    const activityCoordinator = host._getActivityCoordinator();
    activityCoordinator.start();
    host._activityStateCleanup = activityCoordinator.subscribe((state, previousState) => {
      if (state === "hidden" && host._hassUpdateFrame) {
        cancelAnimationFrame(host._hassUpdateFrame);
        host._hassUpdateFrame = 0;
        host._hassReconcilePending = true;
      }
      if (previousState === "hidden" && state !== "hidden") {
        ensureMounted({ reason: "visibility change" });
      }
      if (
        ["hidden", "covered"].includes(previousState)
        && ["active", "idle-visible"].includes(state)
      ) {
        host._hassReconcilePending = true;
        scheduleHassUpdate();
      }
    });
    host._clockCadenceCleanups = [
      activityCoordinator.subscribeCadence("second", (now) => {
        host._updateStatusDom(now);
        host._updateClockWidgets(now);
      }, { scope: "dashboard" }),
      activityCoordinator.subscribeCadence("second", () => {
        const screensaverState = host._screensaverController.read();
        if (host._getScreensaverVisible()) {
          host._updateScreensaverClockVariant(screensaverState.clockVariant);
        }
      }, {
        scope: "overlay",
        isEnabled: () => host._getScreensaverVisible(),
      }),
    ];
    host._systemThemeListener = () => {
      if (host._themeController.read().themeSetting === "auto") {
        host._transitionSystemThemeChange();
      }
    };
    window.matchMedia?.("(prefers-color-scheme: light)")?.addEventListener?.("change", host._systemThemeListener);
    ensureMounted({ force: isReconnect, reason: isReconnect ? "panel reconnect" : "initial connection" });
    scheduleHassUpdate();
    host._activityListener = () => handleRuntimeUserActivity(host, activityCoordinator);
    ACTIVITY_EVENT_TYPES.forEach((type) => window.addEventListener(type, host._activityListener, { passive: true }));
    host._scheduleScreensaverIdleTimer();
    host._resizeListener = () => {
      host._handleUserActivity();
      host._handleViewportChange();
    };
    window.addEventListener("resize", host._resizeListener);
    window.visualViewport?.addEventListener("resize", host._resizeListener);
    window.addEventListener("orientationchange", host._resizeListener);
    host._settingsOpenListener = () => host._openSettings();
    host.shadowRoot.addEventListener("mha-open-settings", host._settingsOpenListener);
    host._applyHaSidebarMode(host._hideHaSidebar);
  }

  function disconnectedCallback() {
    host._connectionActive = false;
    removeConnectionListeners();
    window.matchMedia?.("(prefers-color-scheme: light)")?.removeEventListener?.("change", host._systemThemeListener);
    host._clockCadenceCleanups?.forEach?.(cleanup => cleanup());
    host._clockCadenceCleanups = [];
    host._activityStateCleanup?.();
    host._activityStateCleanup = null;
    host._activityCoordinator?.stop?.();
    clearTimeout(host._bootWatchdog);
    host._bootWatchdog = 0;
    clearTimeout(host._bootRevealTimer);
    host._bootRevealTimer = 0;
    cancelAnimationFrame(host._hassUpdateFrame);
    host._hassUpdateFrame = 0;
    cancelAnimationFrame(host._readyRaf);
    host._readyRaf = 0;
    cancelAnimationFrame(host._viewportRaf);
    host._viewportRaf = 0;
    clearTimeout(host._relayoutTimer);
    host._relayoutTimer = 0;
    cancelAnimationFrame(host._widgetRenderFrame);
    host._widgetRenderFrame = 0;
    cancelAnimationFrame(host._secondaryUiFrame);
    host._secondaryUiFrame = 0;
    cancelAnimationFrame(host._widgetDropSlotsFrame);
    host._widgetDropSlotsFrame = 0;
    host._gridRuntime.destroy();
    host._appearanceCoordinator.destroy();
    host._wallpaperController?.destroy?.();
    cancelAnimationFrame(host._iconSymbolRefreshFrame);
    host._iconSymbolRefreshFrame = 0;
    cancelAnimationFrame(host._haSidebarReservedWidthFrame);
    host._haSidebarReservedWidthFrame = 0;
    clearTimeout(host._haSidebarReservedWidthTimeout);
    host._haSidebarReservedWidthTimeout = 0;
    host._clearGridScrollListener();
    ACTIVITY_EVENT_TYPES.forEach((type) => window.removeEventListener(type, host._activityListener));
    host._screensaverController.destroy();
    window.removeEventListener("resize", host._resizeListener);
    window.visualViewport?.removeEventListener("resize", host._resizeListener);
    window.removeEventListener("orientationchange", host._resizeListener);
    clearTimeout(host._responsiveRelayoutTimer);
    host._responsiveRelayoutTimer = null;
    if (host._settingsOpenListener) {
      host.shadowRoot.removeEventListener("mha-open-settings", host._settingsOpenListener);
    }
    host._applyHaSidebarMode(false);
    host._destroyDomRoot();
  }

  return {
    hasMountedApp,
    ensureMounted,
    addConnectionListeners,
    removeConnectionListeners,
    scheduleHassUpdate,
    updateFromHass,
    finishBoot,
    startBootWatchdog,
    markReadyAfterPaint,
    tryCompleteBoot,
    connectedCallback,
    disconnectedCallback,
  };
}
