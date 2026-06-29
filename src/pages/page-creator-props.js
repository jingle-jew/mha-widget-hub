import { getPageIconLabel, PAGE_ICON_OPTIONS } from "./page-icons.js";
import { getPageCreatorTypeOptions, PAGE_TYPES } from "./page-types.js";

export function buildPageCreatorState({
  open = false,
  selectedPageType = PAGE_TYPES.GRID,
  selectedIcon = "grid",
} = {}) {
  return {
    open,
    selectedPageType,
    pageTypeOptions: getPageCreatorTypeOptions().map(option => ({
      ...option,
      selected: option.value === selectedPageType,
    })),
    selectedIcon,
    iconOptions: PAGE_ICON_OPTIONS.map((option) => ({
      ...option,
      label: getPageIconLabel(option),
      selected: option.name === selectedIcon,
    })),
  };
}
