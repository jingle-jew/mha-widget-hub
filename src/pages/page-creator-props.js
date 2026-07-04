import { getPageCreatorTypeOptions, PAGE_TYPES } from "./page-types.js";

export function buildPageCreatorState({
  open = false,
  themeStyle = "oneui",
  selectedPageType = PAGE_TYPES.GRID,
} = {}) {
  const pageTypeOptions = getPageCreatorTypeOptions({ themeStyle });
  const resolvedSelectedPageType = pageTypeOptions.some(option => option.value === selectedPageType)
    ? selectedPageType
    : PAGE_TYPES.GRID;

  return {
    open,
    selectedPageType: resolvedSelectedPageType,
    pageTypeOptions: pageTypeOptions.map(option => ({
      ...option,
      selected: option.value === resolvedSelectedPageType,
    })),
  };
}
