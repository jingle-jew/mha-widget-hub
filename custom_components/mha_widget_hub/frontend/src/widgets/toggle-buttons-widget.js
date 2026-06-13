import { createIconSymbol } from "../ui/icon-symbol.js";
import { createButton } from "../ui/button.js";
import { createToggleWidgetContent } from "./toggle-widget.js";
import { isWidgetKind } from "./widget-registry.js";

export const TOGGLE_BUTTONS_WIDGET_KIND = "toggle-buttons";

const BUTTON_SLOTS = Object.freeze([
  { type: "power", icon: "power", label: "Alimentation" },
  { type: "preset", value: "1" },
  { type: "preset", value: "2" },
  { type: "preset", value: "3" },
]);

export function isToggleButtonsWidget(widget = {}) {
  return isWidgetKind(widget, TOGGLE_BUTTONS_WIDGET_KIND);
}

function getMockChecked(widget = {}) {
  if (typeof widget.checked === "boolean") return widget.checked;
  return ["on", "true", "active", "open"].includes(String(widget.state || "").toLowerCase());
}

function setButtonPressed(button, pressed) {
  button.dataset.pressed = String(Boolean(pressed));
  button.setAttribute("aria-pressed", String(Boolean(pressed)));
}

export function createToggleButtonsWidgetContent(widget = {}, {
  widgetW = Number(widget?.w) || 4,
} = {}) {
  let mockChecked = getMockChecked(widget);
  let selectedPreset = String(widget?.selectedPreset || "1");

  const root = document.createElement("div");
  root.className = "combined-toggle-buttons";
  root.dataset.widgetComponent = "toggle-buttons";
  root.dataset.checked = String(mockChecked);

  const toggleSection = document.createElement("div");
  toggleSection.className = "combined-toggle-buttons__toggle";
  toggleSection.append(createToggleWidgetContent({
    ...widget,
    checked: mockChecked,
  }, {
    widgetW,
    widgetH: 1,
    onToggle: (nextChecked) => {
      mockChecked = Boolean(nextChecked);
      root.dataset.checked = String(mockChecked);
      setButtonPressed(powerButton, mockChecked);
    },
  }));

  const actionsSection = document.createElement("div");
  actionsSection.className = "combined-toggle-buttons__actions";

  const powerButton = createButton({
    label: "",
    className: "combined-toggle-buttons__button combined-toggle-buttons__button--power",
  });
  powerButton.setAttribute("aria-label", BUTTON_SLOTS[0].label);
  powerButton.replaceChildren(createIconSymbol({
    name: BUTTON_SLOTS[0].icon,
    className: "combined-toggle-buttons__button-icon",
  }));
  setButtonPressed(powerButton, mockChecked);
  powerButton.addEventListener("click", (event) => {
    event.preventDefault();
    mockChecked = !mockChecked;
    root.dataset.checked = String(mockChecked);
    setButtonPressed(powerButton, mockChecked);
  });
  actionsSection.append(powerButton);

  BUTTON_SLOTS.slice(1).forEach((slot) => {
    const button = createButton({
      label: slot.value,
      className: "combined-toggle-buttons__button combined-toggle-buttons__button--preset",
      pressed: selectedPreset === slot.value,
    });
    button.dataset.preset = slot.value;
    setButtonPressed(button, selectedPreset === slot.value);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      selectedPreset = slot.value;
      actionsSection.querySelectorAll(".combined-toggle-buttons__button--preset").forEach((candidate) => {
        setButtonPressed(candidate, candidate.dataset.preset === selectedPreset);
      });
    });
    actionsSection.append(button);
  });

  root.append(toggleSection, actionsSection);
  return root;
}
