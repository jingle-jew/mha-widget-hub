export function bindWidgetRuntimeActivity(shell, component) {
  if (!shell) return false;
  shell?._mhaRuntimeActivityCleanup?.();
  shell._mhaRuntimeActivityCleanup = null;
  if (!component) return false;

  queueMicrotask(() => {
    if (!shell.isConnected || !component.isConnected) return;
    const host = shell.getRootNode?.()?.host;
    const coordinator = host?._getActivityCoordinator?.();
    if (!coordinator) return;
    shell._mhaRuntimeActivityCleanup = coordinator.observeViewport(component, (visible) => {
      component.__mhaSetRuntimeViewport?.(visible);
    });
  });
  return true;
}

export function destroyWidgetRuntimeActivity(shell) {
  shell?._mhaRuntimeActivityCleanup?.();
  if (shell) shell._mhaRuntimeActivityCleanup = null;
}
