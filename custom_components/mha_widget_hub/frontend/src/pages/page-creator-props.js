import { getPageIconLabel, PAGE_ICON_OPTIONS } from "./page-icons.js";

export function buildPageCreatorState({
  open = false,
  selectedIcon = "grid",
} = {}) {
  return {
    open,
    selectedIcon,
    iconOptions: PAGE_ICON_OPTIONS.map((option) => ({
      ...option,
      label: getPageIconLabel(option),
      selected: option.name === selectedIcon,
    })),
  };
}
