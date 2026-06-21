export function getEditButtonIcon(icons, editing = false) {
  return editing ? icons.close : icons.edit;
}
