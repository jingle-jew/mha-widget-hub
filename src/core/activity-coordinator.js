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

export class ActivityCoordinator {
  constructor({
    host = null,
    documentRef = globalThis.document,
    now = Date.now,
    setTimeoutRef = globalThis.setTimeout,
    clearTimeoutRef = globalThis.clearTimeout,
    isCovered = () => false,
    idleAfterMs = 15 * 1000,
  } = {}) {
    this.host = host;
    this.documentRef = documentRef;
    this.now = now;
    this.setTimeoutRef = setTimeoutRef;
    this.clearTimeoutRef = clearTimeoutRef;
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
    this.sync();
    this.runCadences({ force: true });
    return true;
  }

  stop() {
    if (!this.started) return false;
    this.started = false;
    this.documentRef?.removeEventListener?.("visibilitychange", this.onVisibilityChange);
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
  }
}

export function createActivityCoordinator(options = {}) {
  return new ActivityCoordinator(options);
}
