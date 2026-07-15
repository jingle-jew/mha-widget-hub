/*
 * MHA form controls.
 *
 * Native inputs remain the source of truth for values and accessibility, while
 * the visible interaction surface is fully controlled by MHA.
 */

let selectId = 0;

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

function normalizeOptions(options = []) {
  return options.map((item) => ({
    value: String(item?.value ?? ""),
    label: String(item?.label ?? item?.value ?? ""),
    disabled: Boolean(item?.disabled),
  }));
}

function createNativeOption(item, selectedValue) {
  const option = document.createElement("option");
  option.value = item.value;
  option.textContent = item.label;
  option.disabled = item.disabled;
  option.selected = item.value === selectedValue;
  return option;
}

function focusOption(optionButtons, index) {
  const enabled = optionButtons.filter(option => !option.disabled);
  if (!enabled.length) return;
  const normalizedIndex = (index + enabled.length) % enabled.length;
  enabled[normalizedIndex]?.focus?.({ preventScroll: true });
}

export function createMhaSelect({
  label = "",
  value = "",
  options = [],
  disabled = false,
  className = "",
  triggerClassName = "",
  inputClassName = "",
  onChange,
} = {}) {
  const normalizedOptions = normalizeOptions(options);
  const requestedValue = String(value ?? "");
  const initialValue = normalizedOptions.some(item => item.value === requestedValue)
    ? requestedValue
    : normalizedOptions[0]?.value || "";
  const id = `mha-select-${++selectId}`;

  const root = document.createElement("div");
  root.className = joinClassNames("mha-select", className);
  root.dataset.open = "false";

  const input = document.createElement("select");
  input.className = joinClassNames("mha-select-native", inputClassName);
  input.tabIndex = -1;
  input.disabled = Boolean(disabled);
  input.setAttribute("aria-hidden", "true");
  input.append(...normalizedOptions.map(item => createNativeOption(item, initialValue)));
  input.value = initialValue;

  const trigger = document.createElement("button");
  trigger.className = joinClassNames("mha-select-trigger", triggerClassName);
  trigger.type = "button";
  trigger.disabled = Boolean(disabled);
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-label", label || "Select");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${id}-listbox`);

  const valueText = document.createElement("span");
  valueText.className = "mha-select-value";

  const chevron = document.createElement("span");
  chevron.className = "mha-select-chevron";
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(valueText, chevron);

  const menu = document.createElement("div");
  menu.className = "mha-select-menu";
  menu.id = `${id}-listbox`;
  menu.hidden = true;
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", label || "Options");

  const optionButtons = normalizedOptions.map((item) => {
    const button = document.createElement("button");
    button.className = "mha-select-option";
    button.type = "button";
    button.disabled = item.disabled;
    button.dataset.value = item.value;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");

    const optionLabel = document.createElement("span");
    optionLabel.className = "mha-select-option-label";
    optionLabel.textContent = item.label;

    const check = document.createElement("span");
    check.className = "mha-select-option-check";
    check.setAttribute("aria-hidden", "true");
    button.append(optionLabel, check);
    menu.append(button);
    return button;
  });

  let removeOutsideListener = () => {};

  const syncValue = (nextValue) => {
    const normalizedValue = String(nextValue ?? "");
    const selected = normalizedOptions.find(item => item.value === normalizedValue)
      || normalizedOptions[0]
      || { value: "", label: "" };
    input.value = selected.value;
    valueText.textContent = selected.label;
    trigger.dataset.value = selected.value;
    optionButtons.forEach((button) => {
      const isSelected = button.dataset.value === selected.value;
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected && !button.disabled ? 0 : -1;
    });
    return selected.value;
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (root.dataset.open !== "true") return;
    root.dataset.open = "false";
    const stackingContainer = root.closest?.(".mha-settings-section");
    if (stackingContainer) delete stackingContainer.dataset.selectOpen;
    trigger.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    removeOutsideListener();
    removeOutsideListener = () => {};
    if (restoreFocus) trigger.focus?.({ preventScroll: true });
  };

  const updatePlacement = () => {
    const triggerRect = trigger.getBoundingClientRect?.();
    const boundaryRect = root.closest?.(".mha-settings-body")?.getBoundingClientRect?.();
    if (!triggerRect || !boundaryRect) return;
    const spaceBelow = boundaryRect.bottom - triggerRect.bottom;
    const spaceAbove = triggerRect.top - boundaryRect.top;
    const preferredHeight = Math.min(menu.scrollHeight || 240, 240) + 8;
    root.dataset.placement = spaceBelow < preferredHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  };

  const openMenu = ({ focus = "selected" } = {}) => {
    if (trigger.disabled || root.dataset.open === "true") return;
    root.dataset.open = "true";
    const stackingContainer = root.closest?.(".mha-settings-section");
    if (stackingContainer) stackingContainer.dataset.selectOpen = "true";
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    updatePlacement();

    const ownerDocument = root.ownerDocument || globalThis.document;
    const onOutsidePointerDown = (event) => {
      const composedPath = event.composedPath?.() || [];
      const isInside = composedPath.includes(root) || root.contains?.(event.target);
      if (!isInside) closeMenu();
    };
    ownerDocument?.addEventListener?.("pointerdown", onOutsidePointerDown, true);
    removeOutsideListener = () => ownerDocument?.removeEventListener?.("pointerdown", onOutsidePointerDown, true);

    if (focus) {
      const enabled = optionButtons.filter(option => !option.disabled);
      const selectedIndex = enabled.findIndex(button => button.getAttribute("aria-selected") === "true");
      const targetIndex = focus === "last" ? enabled.length - 1 : Math.max(0, selectedIndex);
      focusOption(enabled, targetIndex);
    }
  };

  const commitValue = (nextValue) => {
    const previousValue = input.value;
    const next = syncValue(nextValue);
    closeMenu({ restoreFocus: true });
    if (next !== previousValue) onChange?.(next, input);
  };

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => commitValue(button.dataset.value));
    button.addEventListener("keydown", (event) => {
      const enabled = optionButtons.filter(option => !option.disabled);
      const currentIndex = enabled.indexOf(button);
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        focusOption(enabled, currentIndex + 1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        focusOption(enabled, currentIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusOption(enabled, 0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusOption(enabled, enabled.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        commitValue(button.dataset.value);
      }
    });
  });

  trigger.addEventListener("click", () => {
    if (root.dataset.open === "true") closeMenu();
    else openMenu({ focus: "" });
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu({ focus: event.key === "ArrowUp" ? "last" : "selected" });
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || root.dataset.open !== "true") return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu({ restoreFocus: true });
  });
  input.addEventListener("change", () => onChange?.(syncValue(input.value), input));

  const setDisabled = (nextDisabled) => {
    const isDisabled = Boolean(nextDisabled);
    input.disabled = isDisabled;
    trigger.disabled = isDisabled;
    if (isDisabled) closeMenu();
  };

  const api = { setValue: syncValue, setDisabled, open: openMenu, close: closeMenu };
  root.__mhaSelectApi = api;
  input.__mhaSelectApi = api;
  syncValue(initialValue);
  root.append(input, trigger, menu);
  return root;
}

function createMhaChoice({
  type,
  label = "",
  checked = false,
  disabled = false,
  name = "",
  value = "",
  indicatorPlacement = "start",
  className = "",
  inputClassName = "",
  labelClassName = "",
  onChange,
} = {}) {
  const root = document.createElement("label");
  root.className = joinClassNames("mha-choice", `mha-${type}`, className);
  root.dataset.indicatorPlacement = indicatorPlacement === "end" ? "end" : "start";

  const input = document.createElement("input");
  input.className = joinClassNames("mha-choice-input", inputClassName);
  input.type = type;
  input.checked = Boolean(checked);
  input.disabled = Boolean(disabled);
  if (name) input.name = name;
  if (value !== undefined) input.value = String(value);

  const text = document.createElement("span");
  text.className = joinClassNames("mha-choice-label", labelClassName);
  text.textContent = label;

  const indicator = document.createElement("span");
  indicator.className = "mha-choice-indicator";
  indicator.setAttribute("aria-hidden", "true");

  input.addEventListener("change", (event) => onChange?.(Boolean(input.checked), event));
  root.append(input, text, indicator);
  return root;
}

export function createMhaCheckbox(options = {}) {
  return createMhaChoice({ ...options, type: "checkbox" });
}

export function createMhaRadio(options = {}) {
  return createMhaChoice({ ...options, type: "radio" });
}
