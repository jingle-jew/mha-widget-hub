export function createPagePanel({
  page = null,
  kind = "grid",
  content = null,
} = {}) {
  const panel = document.createElement("section");
  panel.className = "mha-page-panel";
  panel.dataset.pagePanel = kind;
  panel.dataset.pageId = page?.id || "";
  panel.dataset.pageType = page?.type || "grid";
  if (content) panel.append(content);
  return panel;
}
