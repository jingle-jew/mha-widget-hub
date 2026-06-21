export function saveWidgetsForCurrentPage(
  host,
  {
    normalizeStoredWidgetContractRef,
  } = {},
) {
  /*
   * Persistence is independent from the legacy auto-pack validator.
   *
   * The current grid uses explicit ghost-slot positions. Placement is validated
   * before this helper by the position-map validator, while resize/move paths
   * validate their own candidate state before saving.
   *
   * mha-grid-pages is the single source of truth after schema migration.
   * Legacy order/size/custom-widget keys remain readable for one-time import,
   * but runtime saves must not mirror only the active page back into them.
   */
  host._widgets = host._normalizeWidgetsToGridBounds(
    host._widgets.map(normalizeStoredWidgetContractRef),
  );

  return host._syncActivePageWidgets();
}
