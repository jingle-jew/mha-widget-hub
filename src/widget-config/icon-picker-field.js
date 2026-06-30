export function createInlineIconNameRow(inputControl, iconPicker) {
  iconPicker?.classList?.add("mha-widget-icon-picker--inline");

  const row = document.createElement("div");
  row.className = "mha-widget-config-icon-name-row";
  if (inputControl) row.append(inputControl);
  if (iconPicker) row.append(iconPicker);
  return row;
}
