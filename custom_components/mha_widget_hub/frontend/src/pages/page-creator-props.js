import { getPageCreatorTypeOptions, PAGE_TYPES } from "./page-types.js";

export function buildPageCreatorState({
  open = false,
  selectedPageType = PAGE_TYPES.GRID,
} = {}) {
  return {
    open,
    selectedPageType,
    pageTypeOptions: getPageCreatorTypeOptions().map(option => ({
      ...option,
      selected: option.value === selectedPageType,
    })),
  };
}
