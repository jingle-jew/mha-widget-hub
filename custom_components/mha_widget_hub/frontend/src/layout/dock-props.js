export function buildDockStateProps({
  pages = [],
  activePageId = "",
  isEditing = false,
} = {}) {
  return {
    pages,
    activePageId,
    isEditing,
  };
}
