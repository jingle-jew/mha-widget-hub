export const WIDGET_MANAGER_CATEGORIES = Object.freeze([
  { id:"utilities", label:"Utilitaires", description:"Horloges et infos rapides.", icon:"◷", widgets:[
    {kind:"clock",variant:"digital",label:"Horloge numérique",size:{w:2,h:2},description:"Heure et date."},
    {kind:"clock",variant:"analog",label:"Horloge analogique",size:{w:2,h:2},description:"Cadran simple."},
    {kind:"clock",variant:"ios-analog",label:"Analogique iOS",size:{w:2,h:2},description:"Cadran classique iOS."},
    {kind:"clock",variant:"scientific",label:"Horloge scientifique",size:{w:2,h:2},description:"Temps + indicateurs."},
  ]},
  { id:"weather", label:"Météo", description:"Conditions météo actuelles.", icon:"☁", widgets:[
    {kind:"weather",variant:"current",label:"Météo actuelle",size:{w:2,h:2},description:"Conditions actuelles sans prévisions horaires."},
  ]},
  { id:"lights", label:"Lumières", description:"Contrôles rapides et intensité.", icon:"💡", widgets:[
    {kind:"empty",variant:"light-toggle",label:"Tuile lumière",size:{w:2,h:2},description:"Contrôle simple."},
    {kind:"slider",variant:"light-slider-wide",label:"Intensité horizontale",size:{w:4,h:1},description:"Slider large."},
    {kind:"slider",variant:"light-slider-vertical",label:"Intensité verticale",size:{w:1,h:4},description:"Slider vertical."},
  ]},
  { id:"climate", label:"Climat", description:"Température et confort.", icon:"🌡", widgets:[
    {kind:"empty",variant:"climate-compact",label:"Climat compact",size:{w:2,h:2},description:"Température rapide."},
    {kind:"empty",variant:"climate-wide",label:"Climat large",size:{w:4,h:2},description:"Température + mode."},
    {kind:"slider",variant:"temperature-slider",label:"Température slider",size:{w:4,h:1},description:"Contrôle linéaire."},
  ]},
  { id:"media", label:"Média", description:"Lecture et volume.", icon:"♪", widgets:[
    {kind:"empty",variant:"media-compact",label:"Média compact",size:{w:2,h:2},description:"Lecture rapide."},
    {kind:"empty",variant:"media-wide",label:"Média large",size:{w:4,h:2},description:"Now playing."},
    {kind:"slider",variant:"volume-slider",label:"Volume",size:{w:4,h:1},description:"Slider volume."},
  ]},
  { id:"security", label:"Sécurité", description:"Alarmes, serrures et état.", icon:"⌂", widgets:[
    {kind:"empty",variant:"security-state",label:"État sécurité",size:{w:2,h:2},description:"Statut rapide."},
    {kind:"empty",variant:"security-wide",label:"Sécurité large",size:{w:4,h:2},description:"Contrôles principaux."},
  ]},
  { id:"system", label:"Système", description:"Maintenance, réseau et énergie.", icon:"⚙", widgets:[
    {kind:"empty",variant:"system-compact",label:"Système compact",size:{w:2,h:2},description:"État système."},
    {kind:"empty",variant:"system-wide",label:"Système large",size:{w:4,h:2},description:"Infos détaillées."},
    {kind:"empty",variant:"system-panel",label:"Panneau système",size:{w:4,h:3},description:"Grand panneau."},
  ]},
]);

const sizeLabel = (size = {}) => `${size.w || 2}×${size.h || 2}`;

function createPreview(item) {
  const preview = document.createElement("div");
  preview.className = "mha-widget-manager-preview";
  preview.dataset.kind = item.kind || "empty";
  preview.style.setProperty("--mha-preview-w", String(item.size?.w || 2));
  preview.style.setProperty("--mha-preview-h", String(item.size?.h || 2));
  const shape = document.createElement("div");
  shape.className = "mha-widget-manager-preview-shape";
  if (item.kind === "slider") {
    const rail = document.createElement("span");
    rail.className = "mha-widget-manager-preview-slider";
    rail.dataset.orientation = (item.size?.h || 1) > (item.size?.w || 1) ? "vertical" : "horizontal";
    shape.append(rail);
  } else if (item.kind === "clock") {
    const clock = document.createElement("span");
    clock.className = "mha-widget-manager-preview-clock";
    clock.dataset.variant = item.variant || "digital";
    clock.textContent = item.variant === "analog" || item.variant === "ios-analog" ? "◷" : item.variant === "scientific" ? "T+" : "12:45";
    shape.append(clock);
  } else if (item.kind === "weather") {
    const weather = document.createElement("span");
    weather.className = "mha-widget-manager-preview-weather";
    weather.textContent = "☁ 21°";
    shape.append(weather);
  } else {
    const dot = document.createElement("span");
    dot.className = "mha-widget-manager-preview-dot";
    const line = document.createElement("span");
    line.className = "mha-widget-manager-preview-line";
    shape.append(dot, line);
  }
  preview.append(shape);
  return preview;
}

function createCategoryButton(category, onSelectCategory) {
  const button = document.createElement("button");
  button.className = "mha-widget-manager-category";
  button.type = "button";
  const icon = document.createElement("span");
  icon.className = "mha-widget-manager-category-icon";
  icon.textContent = category.icon || "□";
  const text = document.createElement("span");
  text.className = "mha-widget-manager-category-text";
  const label = document.createElement("strong");
  label.textContent = category.label;
  const description = document.createElement("small");
  description.textContent = category.description || "";
  text.append(label, description);
  button.append(icon, text);
  button.addEventListener("click", () => onSelectCategory?.(category.id));
  return button;
}

function createWidgetButton(category, item, onSelectWidget) {
  const button = document.createElement("button");
  button.className = "mha-widget-manager-widget";
  button.type = "button";
  const content = document.createElement("span");
  content.className = "mha-widget-manager-widget-content";
  const labelRow = document.createElement("span");
  labelRow.className = "mha-widget-manager-widget-label-row";
  const label = document.createElement("strong");
  label.textContent = item.label;
  const badge = document.createElement("span");
  badge.className = "mha-widget-manager-size-badge";
  badge.textContent = sizeLabel(item.size);
  labelRow.append(label, badge);
  const description = document.createElement("small");
  description.textContent = item.description || "";
  content.append(labelRow, description);
  button.append(createPreview(item), content);
  button.addEventListener("click", () => onSelectWidget?.({ ...item, category: category.id }));
  return button;
}

export function createWidgetManager({open=false,activeCategory="",categories=WIDGET_MANAGER_CATEGORIES,onClose,onBack,onSelectCategory,onSelectWidget} = {}) {
  const selectedCategory = categories.find((category) => category.id === activeCategory) || null;
  const root = document.createElement("aside");
  root.className = "mha-widget-manager-panel mha-settings-panel";
  root.dataset.open = String(Boolean(open));
  root.dataset.view = selectedCategory ? "widgets" : "categories";
  root.setAttribute("aria-hidden", String(!open));
  root.hidden = !open;
  const scrim = document.createElement("button");
  scrim.className = "mha-widget-manager-scrim mha-settings-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "Fermer le gestionnaire de widgets");
  scrim.addEventListener("click", (event) => { event.stopPropagation(); onClose?.(); });
  const sheet = document.createElement("div");
  sheet.className = "mha-widget-manager-sheet mha-settings-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Gestionnaire de widgets");
  ["pointerdown","pointerup","click","touchstart","touchmove","touchend","wheel"].forEach((type) => {
    root.addEventListener(type, (event) => event.stopPropagation(), { passive: type !== "wheel" });
  });
  const header = document.createElement("header");
  header.className = "mha-widget-manager-header mha-settings-header";
  const title = document.createElement("div");
  title.className = "mha-settings-title-block";
  const eyebrow = document.createElement("span");
  eyebrow.className = "mha-settings-eyebrow";
  eyebrow.textContent = selectedCategory ? "Widgets" : "MHA";
  const h2 = document.createElement("h2");
  h2.className = "mha-settings-title";
  h2.textContent = selectedCategory ? selectedCategory.label : "Widgets";
  title.append(eyebrow, h2);
  const actions = document.createElement("div");
  actions.className = "mha-widget-manager-actions";
  if (selectedCategory) {
    const back = document.createElement("button");
    back.className = "mha-widget-manager-back";
    back.type = "button";
    back.textContent = "‹";
    back.setAttribute("aria-label", "Retour aux catégories");
    back.addEventListener("click", () => onBack?.());
    actions.append(back);
  }
  const close = document.createElement("button");
  close.className = "mha-settings-close";
  close.type = "button";
  close.setAttribute("aria-label", "Fermer");
  close.textContent = "×";
  close.addEventListener("click", () => onClose?.());
  actions.append(close);
  header.append(title, actions);
  const body = document.createElement("div");
  body.className = "mha-widget-manager-body mha-settings-body";
  if (selectedCategory) {
    const list = document.createElement("div");
    list.className = "mha-widget-manager-widget-list";
    selectedCategory.widgets.forEach((item) => list.append(createWidgetButton(selectedCategory, item, onSelectWidget)));
    body.append(list);
  } else {
    const grid = document.createElement("div");
    grid.className = "mha-widget-manager-category-grid";
    categories.forEach((category) => grid.append(createCategoryButton(category, onSelectCategory)));
    body.append(grid);
  }
  sheet.append(header, body);
  root.append(scrim, sheet);
  return root;
}
