export function buildWidgetManagerState({
  open = false,
  activeCategory = "",
  categories = [],
} = {}) {
  return {
    open,
    activeCategory,
    categories,
  };
}
