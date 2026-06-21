export function openDockPageSettingsForPage(
  host,
  id = "",
  {
    openSettingsPageRef,
  } = {},
) {
  if (!host._pages.some(page => page.id === id)) return undefined;

  return openSettingsPageRef("dock-detail", { dockPageId: id });
}
