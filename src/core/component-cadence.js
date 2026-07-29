export function bindComponentCadence(component, cadence, callback, options = {}) {
  if (!component || typeof callback !== "function") return () => {};
  let destroyed = false;
  let unsubscribe = null;

  queueMicrotask(() => {
    if (destroyed) return;
    const host = component.getRootNode?.()?.host;
    const coordinator = host?._getActivityCoordinator?.();
    if (!coordinator?.subscribeCadence) return;
    unsubscribe = coordinator.subscribeCadence(cadence, callback, options);
  });

  return () => {
    destroyed = true;
    unsubscribe?.();
    unsubscribe = null;
  };
}
