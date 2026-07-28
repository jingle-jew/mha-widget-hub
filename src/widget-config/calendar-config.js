import { getEntityOptionsByDomain } from "./light-options.js";

export function normalizeCalendarEntityIds(value = []) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values
    .map(entityId => String(entityId || "").trim())
    .filter(entityId => entityId.startsWith("calendar.")))];
}

export function createCalendarConfigDraft(widget = {}, hass, visibilityConfig) {
  const configured = normalizeCalendarEntityIds(
    widget.calendarEntityIds || widget.entityIds || widget.entityId || widget.entity_id,
  );
  const draft = { calendarEntityIds: configured };
  return reconcileCalendarConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileCalendarConfigDraft(draft, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "calendar", visibilityConfig);
  const availableIds = new Set(options.map(option => option.value));
  draft.calendarEntityIds = normalizeCalendarEntityIds(draft.calendarEntityIds)
    .filter(entityId => availableIds.has(entityId));
  if (!draft.calendarEntityIds.length && options[0]?.value) {
    draft.calendarEntityIds = [options[0].value];
  }
  return {
    draft,
    options,
    selected: options.filter(option => draft.calendarEntityIds.includes(option.value)),
  };
}

export function updateCalendarSelection(draft, entityId, checked) {
  const selected = new Set(normalizeCalendarEntityIds(draft.calendarEntityIds));
  if (checked) selected.add(String(entityId || ""));
  else selected.delete(String(entityId || ""));
  draft.calendarEntityIds = normalizeCalendarEntityIds([...selected]);
  return draft;
}

export function buildCalendarWidgetConfig(widget, draft, hass, visibilityConfig) {
  reconcileCalendarConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    kind: "calendar",
    type: "calendar",
    component: "calendar-widget",
    calendarEntityIds: [...draft.calendarEntityIds],
  };
}

export function renderCalendarConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createCheckboxControl, t } = helpers;
  const { draft, options } = reconcileCalendarConfigDraft(session.draft, hass, visibilityConfig);
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const group = document.createElement("fieldset");
  group.className = "mha-widget-config-choice-group";
  const legend = document.createElement("legend");
  legend.className = "mha-widget-config-label";
  legend.textContent = t("widgets.calendar.calendars", "Calendars");
  group.append(legend);

  const choices = document.createElement("div");
  choices.className = "mha-widget-config-choices mha-widget-config-choices--stacked";
  if (!options.length) {
    const empty = document.createElement("p");
    empty.className = "mha-widget-config-note";
    empty.textContent = t("widgets.calendar.noCalendars", "No authorized and available calendar.");
    choices.append(empty);
  } else {
    options.forEach((option) => {
      choices.append(createCheckboxControl({
        label: option.label,
        value: option.value,
        checked: draft.calendarEntityIds.includes(option.value),
        onChange: (checked) => {
          updateCalendarSelection(draft, option.value, checked);
          onChange?.({ rerender: true });
        },
      }));
    });
  }
  group.append(choices);
  fields.append(group);

  return {
    fields,
    canSave: draft.calendarEntityIds.length > 0,
    isValid: () => draft.calendarEntityIds.length > 0,
  };
}
