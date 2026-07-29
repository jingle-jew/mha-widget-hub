export const RUNTIME_ACTIVITY_STATES = Object.freeze({
  ACTIVE: "active",
  IDLE_VISIBLE: "idle-visible",
  COVERED: "covered",
  HIDDEN: "hidden",
});

export const RUNTIME_CADENCES = Object.freeze({
  SECOND: "second",
  MINUTE: "minute",
  DAY: "day",
});

const CADENCE_DURATIONS = Object.freeze({
  [RUNTIME_CADENCES.SECOND]: 1000,
  [RUNTIME_CADENCES.MINUTE]: 60 * 1000,
  [RUNTIME_CADENCES.DAY]: 24 * 60 * 60 * 1000,
});

function getLocalDayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getCadenceKey(cadence, timestamp) {
  if (cadence === RUNTIME_CADENCES.DAY) return getLocalDayKey(timestamp);
  return Math.floor(timestamp / CADENCE_DURATIONS[cadence]);
}

function getNextLocalDayDelay(timestamp) {
  const nextDay = new Date(timestamp);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(1, nextDay.getTime() - timestamp);
}

function isDocumentHidden(documentRef) {
  return documentRef?.visibilityState === "hidden";
}

export function isHostRuntimeCovered(host) {
  return Boolean(
    host?._getScreensaverVisible?.()
    || host?._settingsOpen
    || host?._screensaverSettingsOpen
    || host?._widgetSurfaceOpen
  );
}

export class ActivityCoordinator {
  constructor({
    host = null,
    documentRef = globalThis.document,
    now = Date.now,
    setTimeoutRef = globalThis.setTimeout,
    clearTimeoutRef = globalThis.clearTimeout,
    IntersectionObserverClass = globalThis.IntersectionObserver,
    isCovered = () => false,
    idleAfterMs = 15 * 1000,
  } = {}) {
    const timerReceiver = documentRef?.defaultView || globalThis.window || globalThis;
    this.host = host;
    this.documentRef = documentRef;
    this.now = now;
    this.setTimeoutRef = (...args) => Reflect.apply(setTimeoutRef, timerReceiver, args);
    this.clearTimeoutRef = (...args) => Reflect.apply(clearTimeoutRef, timerReceiver, args);
    this.IntersectionObserverClass = IntersectionObserverClass;
    this.isCovered = isCovered;
    this.idleAfterMs = Math.max(0, Number(idleAfterMs) || 0);
    this.state = RUNTIME_ACTIVITY_STATES.ACTIVE;
    this.lastActivityAt = this.now();
    this.started = false;
    this.idleTimer = 0;
    this.cadenceTimer = 0;
    this.stateSubscribers = new Set();
    this.cadenceSubscribers = new Map(
      Object.values(RUNTIME_CADENCES).map(cadence => [cadence, new Set()]),
    );
    this.lastCadenceKeys = new Map();
    this.viewportSubscriptions = new Map();
    this.viewportObserver = null;
    this.onVisibilityChange = () => this.sync({ reconcile: true });
  }

  read() {
    return this.state;
  }

  resolveState(timestamp = this.now()) {
    if (isDocumentHidden(this.documentRef)) return RUNTIME_ACTIVITY_STATES.HIDDEN;
    if (this.isCovered()) return RUNTIME_ACTIVITY_STATES.COVERED;
    if (timestamp - this.lastActivityAt >= this.idleAfterMs) {
      return RUNTIME_ACTIVITY_STATES.IDLE_VISIBLE;
    }
    return RUNTIME_ACTIVITY_STATES.ACTIVE;
  }

  publishState(nextState, { reconcile = false } = {}) {
    const previousState = this.state;
    const changed = previousState !== nextState;
    this.state = nextState;
    if (this.host?.dataset) this.host.dataset.runtimeActivity = nextState;
    if (changed) {
      this.syncComponents();
      this.stateSubscribers.forEach(callback => callback(nextState, previousState));
    }
    if (reconcile && previousState === RUNTIME_ACTIVITY_STATES.HIDDEN && nextState !== previousState) {
      this.runCadences({ force: true });
    }
    return changed;
  }

  sync({ reconcile = false } = {}) {
    const timestamp = this.now();
    const nextState = this.resolveState(timestamp);
    const changed = this.publishState(nextState, { reconcile });
    this.scheduleIdleTransition(timestamp);
    this.scheduleCadenceTimer(timestamp);
    return changed;
  }

  markActive() {
    this.lastActivityAt = this.now();
    return this.sync();
  }

  subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    this.stateSubscribers.add(callback);
    return () => this.stateSubscribers.delete(callback);
  }

  syncComponents(root = this.host?.shadowRoot) {
    const components = root?.querySelectorAll?.("[data-widget-component]") || [];
    components.forEach(component => {
      component.dataset.runtimeActivity = this.state;
      component.__mhaSetRuntimeActivity?.(this.state);
    });
    return components.length;
  }

  ensureViewportObserver() {
    if (this.viewportObserver || typeof this.IntersectionObserverClass !== "function") {
      return this.viewportObserver;
    }
    this.viewportObserver = new this.IntersectionObserverClass((entries) => {
      entries.forEach((entry) => {
        const subscription = this.viewportSubscriptions.get(entry.target);
        if (!subscription) return;
        const visible = Boolean(entry.isIntersecting && entry.intersectionRatio > 0);
        entry.target.dataset.runtimeViewport = visible ? "visible" : "hidden";
        subscription(visible, entry);
      });
    }, { threshold: 0 });
    return this.viewportObserver;
  }

  observeViewport(element, callback = () => {}) {
    if (!element) return () => {};
    element.dataset.runtimeViewportTracked = "true";
    element.dataset.runtimeActivity = this.state;
    element.__mhaSetRuntimeActivity?.(this.state);
    this.viewportSubscriptions.set(element, callback);
    const observer = this.ensureViewportObserver();
    if (observer) {
      element.dataset.runtimeViewport = "hidden";
      callback(false, null);
      observer.observe(element);
    } else {
      element.dataset.runtimeViewport = "visible";
      callback(true, null);
    }
    return () => {
      this.viewportSubscriptions.delete(element);
      this.viewportObserver?.unobserve?.(element);
      delete element.dataset.runtimeViewportTracked;
      delete element.dataset.runtimeViewport;
      delete element.dataset.runtimeActivity;
    };
  }

  canRunScope(scope = "dashboard") {
    if (this.state === RUNTIME_ACTIVITY_STATES.HIDDEN) return false;
    if (scope === "global") return true;
    if (scope === "overlay") return this.state === RUNTIME_ACTIVITY_STATES.COVERED;
    return this.state !== RUNTIME_ACTIVITY_STATES.COVERED;
  }

  subscribeCadence(cadence, callback, {
    scope = "dashboard",
    isEnabled = () => true,
  } = {}) {
    const subscribers = this.cadenceSubscribers.get(cadence);
    if (!subscribers || typeof callback !== "function") return () => {};
    const subscription = { callback, scope, isEnabled };
    subscribers.add(subscription);
    this.scheduleCadenceTimer();
    return () => {
      subscribers.delete(subscription);
      this.scheduleCadenceTimer();
    };
  }

  isSubscriptionRunnable(subscription) {
    return this.canRunScope(subscription.scope) && subscription.isEnabled?.() !== false;
  }

  runCadences({ force = false, timestamp = this.now() } = {}) {
    if (this.state === RUNTIME_ACTIVITY_STATES.HIDDEN) return 0;
    let callCount = 0;
    this.cadenceSubscribers.forEach((subscribers, cadence) => {
      const runnable = [...subscribers].filter(subscription => this.isSubscriptionRunnable(subscription));
      if (!runnable.length) return;
      const key = getCadenceKey(cadence, timestamp);
      if (!force && this.lastCadenceKeys.get(cadence) === key) return;
      this.lastCadenceKeys.set(cadence, key);
      const date = new Date(timestamp);
      runnable.forEach(({ callback }) => {
        callback(date, { cadence, state: this.state, reconcile: force });
        callCount += 1;
      });
    });
    return callCount;
  }

  getNextCadenceDelay(timestamp = this.now()) {
    let delay = Infinity;
    this.cadenceSubscribers.forEach((subscribers, cadence) => {
      if (![...subscribers].some(subscription => this.isSubscriptionRunnable(subscription))) return;
      const duration = CADENCE_DURATIONS[cadence];
      const cadenceDelay = cadence === RUNTIME_CADENCES.DAY
        ? getNextLocalDayDelay(timestamp)
        : duration - (timestamp % duration);
      delay = Math.min(delay, cadenceDelay);
    });
    return Number.isFinite(delay) ? Math.max(1, delay) : null;
  }

  scheduleCadenceTimer(timestamp = this.now()) {
    if (this.cadenceTimer) this.clearTimeoutRef(this.cadenceTimer);
    this.cadenceTimer = 0;
    if (!this.started || this.state === RUNTIME_ACTIVITY_STATES.HIDDEN) return;
    const delay = this.getNextCadenceDelay(timestamp);
    if (delay == null) return;
    this.cadenceTimer = this.setTimeoutRef(() => {
      this.cadenceTimer = 0;
      this.runCadences();
      this.scheduleCadenceTimer();
    }, delay);
  }

  scheduleIdleTransition(timestamp = this.now()) {
    if (this.idleTimer) this.clearTimeoutRef(this.idleTimer);
    this.idleTimer = 0;
    if (
      !this.started
      || this.state === RUNTIME_ACTIVITY_STATES.HIDDEN
      || this.state === RUNTIME_ACTIVITY_STATES.COVERED
      || this.state === RUNTIME_ACTIVITY_STATES.IDLE_VISIBLE
    ) return;
    const delay = Math.max(1, this.idleAfterMs - (timestamp - this.lastActivityAt));
    this.idleTimer = this.setTimeoutRef(() => {
      this.idleTimer = 0;
      this.sync();
    }, delay);
  }

  start() {
    if (this.started) return false;
    this.started = true;
    this.lastActivityAt = this.now();
    this.documentRef?.addEventListener?.("visibilitychange", this.onVisibilityChange);
    this.viewportSubscriptions.forEach((_callback, element) => {
      this.ensureViewportObserver()?.observe?.(element);
    });
    this.sync();
    this.runCadences({ force: true });
    return true;
  }

  stop() {
    if (!this.started) return false;
    this.started = false;
    this.documentRef?.removeEventListener?.("visibilitychange", this.onVisibilityChange);
    this.viewportObserver?.disconnect?.();
    if (this.idleTimer) this.clearTimeoutRef(this.idleTimer);
    if (this.cadenceTimer) this.clearTimeoutRef(this.cadenceTimer);
    this.idleTimer = 0;
    this.cadenceTimer = 0;
    return true;
  }

  destroy() {
    this.stop();
    this.stateSubscribers.clear();
    this.cadenceSubscribers.forEach(subscribers => subscribers.clear());
    this.lastCadenceKeys.clear();
    this.viewportObserver?.disconnect?.();
    this.viewportObserver = null;
    this.viewportSubscriptions.clear();
  }
}

export function createActivityCoordinator(options = {}) {
  return new ActivityCoordinator(options);
}
