const $ = selector => document.querySelector(selector);
const state = { themes: [], themeId: "", mode: "dark", detail: null, draft: {}, history: [], future: [], diff: null, wallpaper: "", customViewport: { width: 1280, height: 800 } };
const categoryLabels = { general: "Général", surfaces: "Surfaces", blur: "Verre", saturation: "Saturation", opacity: "Opacité", grain: "Grain", reflets: "Reflets", bordures: "Bordures", shadows: "Ombres", rayons: "Rayons", dock: "Dock", colors: "Couleurs", couleurs: "Couleurs", controls: "Contrôles", dimensions: "Dimensions", typography: "Typographie", "status-bar": "Status bar" };

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function numericValue(value) { const match = String(value || "").match(/-?\d+(?:\.\d+)?/); return match ? match[0] : "0"; }
function toast(message) { const node = $("#toast"); node.textContent = message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 2600); }
function selectedTheme() { return state.themes.find(theme => theme.id === state.themeId); }
function currentValue(control) { return state.draft[control.id] ?? control.value; }
function originalValue(control) { return control.value || "—"; }
function hasChanges() { return state.detail?.controls.some(control => control.available && currentValue(control) !== control.value) || false; }

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur HTTP ${response.status}`);
  return data;
}

function setDirtyState() { $("#dirty-state").textContent = hasChanges() ? "Modifications non sauvegardées" : "Synchronisé"; $("#dirty-state").classList.toggle("dirty", hasChanges()); }
function pushHistory() { state.history.push({ ...state.draft }); if (state.history.length > 40) state.history.shift(); state.future = []; }

function renderThemeOptions() {
  $("#theme-select").innerHTML = state.themes.map(theme => `<option value="${escapeHtml(theme.id)}">${escapeHtml(theme.label)}${theme.readOnly ? " · lecture seule" : ""}</option>`).join("");
  $("#theme-select").value = state.themeId;
  const theme = selectedTheme();
  $("#variant-select").innerHTML = (theme?.variants || []).map(variant => `<option value="${escapeHtml(variant.id)}">${escapeHtml(variant.label)}</option>`).join("");
  if (theme?.defaultVariant) $("#variant-select").value = theme.defaultVariant;
}

function parseColor(value) {
  const rgba = String(value || "").match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgba) return { hex: `#${[rgba[1], rgba[2], rgba[3]].map(item => Number(item).toString(16).padStart(2, "0")).join("")}`, alpha: rgba[4] ?? "1" };
  const hex = String(value || "").match(/^#([\da-f]{3,8})$/i)?.[1] || "888888";
  const full = hex.length <= 4 ? hex.split("").map(item => item + item).join("") : hex;
  return { hex: `#${full.slice(0, 6)}`, alpha: full.length === 8 ? String(Number.parseInt(full.slice(6), 16) / 255) : "1" };
}

function controlInput(control) {
  const value = currentValue(control);
  if (control.readOnly || control.control === "readonly") return `<code class="readonly-value" title="Token natif complexe ou dérivé non éditable automatiquement">${escapeHtml(value || "—")}</code>`;
  if (control.control === "range") return `<input data-input="${escapeHtml(control.id)}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${escapeHtml(numericValue(value))}"><input data-number="${escapeHtml(control.id)}" type="text" value="${escapeHtml(value)}" aria-label="Valeur ${escapeHtml(control.label)}">`;
  if (control.control === "select") return `<select data-input="${escapeHtml(control.id)}">${control.options.map(option => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
  if (control.control === "color-alpha") { const color = parseColor(value); return `<input data-input="${escapeHtml(control.id)}" type="color" value="${color.hex}" title="Couleur"><input data-alpha="${escapeHtml(control.id)}" type="range" min="0" max="1" step=".01" value="${color.alpha}" title="Alpha">`; }
  return `<input data-input="${escapeHtml(control.id)}" type="text" value="${escapeHtml(value)}" maxlength="120">`;
}

function renderControls() {
  const root = $("#controls");
  const sectionState = new Map([...root.querySelectorAll("details[data-category]")].map(section => [section.dataset.category, section.open]));
  const controls = state.detail?.controls || [];
  $("#read-only-note").hidden = Boolean(controls.length);
  const groups = new Map();
  for (const control of controls.filter(item => item.available && (item.mode === "shared" || item.mode === state.mode))) {
    if (!groups.has(control.category)) groups.set(control.category, []); groups.get(control.category).push(control);
  }
  root.innerHTML = [...groups.entries()].map(([category, items], index) => `<details class="control-section" data-category="${escapeHtml(category)}" ${sectionState.has(category) ? (sectionState.get(category) ? "open" : "") : (index < 3 ? "open" : "")}><summary>${escapeHtml(categoryLabels[category] || category)} <button class="control-reset" data-reset-category="${escapeHtml(category)}" title="Réinitialiser cette catégorie">↺</button></summary>${items.map(control => `<div class="control" data-control="${escapeHtml(control.id)}"><div class="control-head"><label>${escapeHtml(control.label)}</label><button class="control-reset" data-reset-control="${escapeHtml(control.id)}" title="Réinitialiser ce contrôle">↺</button></div><div class="token">${escapeHtml(control.token)}</div><p class="control-description">${escapeHtml(control.description)}</p><div class="control-row">${controlInput(control)}</div><div class="original"><span>Repo: ${escapeHtml(originalValue(control))}</span><span>${escapeHtml(control.unit || "")}</span></div></div>`).join("")}</details>`).join("") || "<p class='notice'>Aucun contrôle déclaré pour ce thème.</p>";
  root.querySelectorAll("[data-input]").forEach(node => node.addEventListener("input", event => onControlInput(event, node.dataset.input)));
  root.querySelectorAll("[data-number]").forEach(node => node.addEventListener("change", event => onNumberInput(event, node.dataset.number)));
  root.querySelectorAll("[data-alpha]").forEach(node => node.addEventListener("input", event => onAlphaInput(event, node.dataset.alpha)));
  root.querySelectorAll("[data-reset-control]").forEach(node => node.addEventListener("click", () => resetControl(node.dataset.resetControl)));
  root.querySelectorAll("[data-reset-category]").forEach(node => node.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); resetCategory(node.dataset.resetCategory); }));
}

function findControlField(attribute, id) { return [...$("#controls").querySelectorAll(`[${attribute}]`)].find(node => node.dataset[attribute.replace("data-", "")] === id); }
function syncControlFields(control) {
  const value = currentValue(control);
  if (control.control === "range") {
    const numberField = findControlField("data-number", control.id);
    if (numberField) numberField.value = value;
  }
  if (control.control === "color-alpha") {
    const color = parseColor(value);
    const colorField = findControlField("data-input", control.id);
    const alphaField = findControlField("data-alpha", control.id);
    if (colorField) colorField.value = color.hex;
    if (alphaField) alphaField.value = color.alpha;
  }
}
function onControlInput(event, id) { const control = state.detail.controls.find(item => item.id === id); if (!control) return; pushHistory(); let value = event.target.value; if (control.control === "range") value = `${value}${control.unit || ""}`; if (control.control === "color-alpha") value = colorValue(event.target.value, parseColor(currentValue(control)).alpha); state.draft[id] = value; syncControlFields(control); syncPreview(); setDirtyState(); }
function onNumberInput(event, id) { const control = state.detail.controls.find(item => item.id === id); if (!control) return; pushHistory(); state.draft[id] = event.target.value; syncControlFields(control); syncPreview(); setDirtyState(); }
function onAlphaInput(event, id) { const control = state.detail.controls.find(item => item.id === id); if (!control) return; pushHistory(); state.draft[id] = colorValue(parseColor(currentValue(control)).hex, event.target.value); syncControlFields(control); syncPreview(); setDirtyState(); }
function colorValue(hex, alpha) { const parsed = parseColor(hex); if (Number(alpha) >= .999) return parsed.hex; return `rgba(${parseInt(parsed.hex.slice(1, 3), 16)},${parseInt(parsed.hex.slice(3, 5), 16)},${parseInt(parsed.hex.slice(5, 7), 16)},${Number(alpha).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})`; }

async function loadTheme(themeId = state.themeId) { state.themeId = themeId; state.detail = await api(`/api/themes/${encodeURIComponent(themeId)}`); state.draft = {}; state.history = []; state.future = []; renderThemeOptions(); $("#theme-label").textContent = state.detail.theme.label; renderControls(); setDirtyState(); syncPreview(); }

function previewViewport() { const raw = $("#viewport-select").value; if (raw === "custom") return state.customViewport; const [width, height] = raw.split("x").map(Number); return { width, height }; }
function syncViewport() { const { width, height } = previewViewport(); const frame = $("#preview-frame"); const wrap = $(".preview-wrap"); if (!frame || !wrap || !width || !height) return; const computed = getComputedStyle(wrap); const availableWidth = Math.max(1, wrap.clientWidth - parseFloat(computed.paddingLeft) - parseFloat(computed.paddingRight) - 8); const availableHeight = Math.max(1, wrap.clientHeight - parseFloat(computed.paddingTop) - parseFloat(computed.paddingBottom) - 8); const scale = Math.max(.05, Math.min(.98, availableWidth / width, availableHeight / height)); frame.style.width = `${width * scale}px`; frame.style.height = `${height * scale}px`; const iframe = $("#preview"); iframe.style.width = `${width}px`; iframe.style.height = `${height}px`; iframe.style.transform = `translate(-50%, -50%) scale(${scale})`; $("#preview-size").textContent = `${width} × ${height}`; }
function backgroundValue() { const value = $("#background-select").value; return { light: "linear-gradient(135deg,#edf2ff,#cbd9f4)", dark: "linear-gradient(135deg,#171b30,#242844)", color: "linear-gradient(135deg,#1bd6d1,#6e5bda 52%,#f064aa)", contrast: "linear-gradient(135deg,#050505,#6b1d52 48%,#ffbd66)", soft: "linear-gradient(135deg,#b6c9d6,#e7d8c6)", solid: "#242844" }[value]; }
function syncPreview() { syncViewport(); const iframe = $("#preview"); if (!iframe.contentDocument) return; const doc = iframe.contentDocument; const hub = doc.querySelector("mha-widget-hub"); if (!hub) return; const theme = selectedTheme(); const variant = $("#variant-select").value || theme?.defaultVariant || ""; doc.documentElement.dataset.theme = state.mode; doc.documentElement.dataset.themeStyle = state.themeId; hub.dataset.theme = state.mode; hub.dataset.themeStyle = state.themeId; if (variant) { hub.dataset.themeVariant = variant; hub.dataset.iosGlass = variant; doc.documentElement.dataset.themeVariant = variant; doc.documentElement.dataset.iosGlass = variant; } doc.body.style.background = state.wallpaper || backgroundValue(); doc.querySelector("[data-dev-menu]")?.setAttribute("hidden", ""); localStorage.removeItem("mha-theme-style"); for (const control of state.detail?.controls || []) { if (control.mode !== "shared" && control.mode !== state.mode) continue; const value = currentValue(control); if (value) hub.style.setProperty(control.token, value); } hub.requestRender?.(); setTimeout(() => { for (const control of state.detail?.controls || []) { if (control.mode !== "shared" && control.mode !== state.mode) continue; const value = currentValue(control); if (value) hub.style.setProperty(control.token, value); } }, 80); }
function resetControl(id) { const control = state.detail.controls.find(item => item.id === id); if (!control) return; pushHistory(); delete state.draft[id]; renderControls(); syncPreview(); setDirtyState(); }
function resetCategory(category) { const controls = state.detail.controls.filter(item => item.category === category); if (!controls.length) return; pushHistory(); controls.forEach(control => delete state.draft[control.id]); renderControls(); syncPreview(); setDirtyState(); }
function resetAll() { if (!hasChanges()) return; pushHistory(); state.draft = {}; renderControls(); syncPreview(); setDirtyState(); toast("Modifications temporaires réinitialisées."); }
function undo() { const previous = state.history.pop(); if (!previous) return; state.future.push({ ...state.draft }); state.draft = previous; renderControls(); syncPreview(); setDirtyState(); }
function redo() { const next = state.future.pop(); if (!next) return; state.history.push({ ...state.draft }); state.draft = next; renderControls(); syncPreview(); setDirtyState(); }

async function showDiff() { try { state.diff = await api("/api/diff", { method: "POST", body: JSON.stringify({ themeId: state.themeId, mode: state.mode, values: state.draft }) }); const content = $("#diff-content"); content.innerHTML = `<p class="diff-summary">${state.diff.changes.length} token(s) · ${state.diff.files.length} fichier(s). Aucun fichier n'a encore été écrit.</p>${state.diff.changes.map(change => `<div class="diff-file"><h3>${escapeHtml(change.label)} · ${escapeHtml(change.token)} · ligne ${change.line || "?"}</h3><pre>${escapeHtml(`${change.oldValue}  →  ${change.newValue}`)}</pre></div>`).join("")}${state.diff.files.map(file => `<div class="diff-file"><h3>${escapeHtml(file.path)}</h3><pre>${escapeHtml(file.diff)}</pre></div>`).join("") || "<p>Aucun changement.</p>"}`; $("#diff-dialog").showModal(); } catch (error) { toast(error.message); } }
async function applyDiff() { if (!state.diff?.files.length) return; try { await api("/api/apply", { method: "POST", body: JSON.stringify({ themeId: state.themeId, mode: state.mode, values: state.draft, snapshots: state.detail.files }) }); $("#diff-dialog").close(); await loadTheme(state.themeId); toast("Thème appliqué au repo."); } catch (error) { toast(error.message); if (error.message.includes("changé")) $("#diff-dialog").close(); } }

async function createTheme() { const label = prompt("Nom affiché du nouveau thème", "MHA Custom"); if (!label) return; const id = prompt("Identifiant technique (minuscules, chiffres, tirets)", label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); if (!id) return; try { const plan = await api("/api/create-plan", { method: "POST", body: JSON.stringify({ sourceTheme: state.themeId, newId: id, label, includeDock: true }) }); const files = plan.files.map(file => file.path).join("\n"); if (!confirm(`Plan de création:\n${files}\n\nCréer ces fichiers et mettre à jour le registre ?`)) return; await api("/api/create-apply", { method: "POST", body: JSON.stringify({ plan }) }); toast("Nouveau thème créé dans les sources canoniques."); location.reload(); } catch (error) { toast(error.message); } }
async function duplicateTheme() { const label = prompt("Nom affiché du thème dupliqué", `${state.detail.theme.label} Copy`); if (!label) return; const id = prompt("Identifiant technique", `${state.themeId}-copy`); if (!id) return; await createThemeWith({ sourceTheme: state.themeId, newId: id, label }); }
async function createThemeWith(payload) { try { const plan = await api("/api/create-plan", { method: "POST", body: JSON.stringify(payload) }); const files = plan.files.map(file => file.path).join("\n"); if (!confirm(`Plan de création:\n${files}\n\nConfirmer ?`)) return; await api("/api/create-apply", { method: "POST", body: JSON.stringify({ plan }) }); toast("Thème créé dans les sources canoniques."); location.reload(); } catch (error) { toast(error.message); } }
function exportPreset() { const overrides = { shared: {}, light: {}, dark: {} }; for (const control of state.detail.controls) { const value = currentValue(control); if (!control.available || value === control.value) continue; const mode = control.mode === "shared" ? "shared" : control.mode; overrides[mode][control.token] = value; } const blob = new Blob([JSON.stringify({ schemaVersion: 1, baseTheme: state.themeId, name: state.detail.theme.label, overrides }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${state.themeId}-theme-studio.json`; link.click(); URL.revokeObjectURL(url); }
function importPreset() { $("#import-file").click(); }
async function readImport(event) { const file = event.target.files[0]; if (!file) return; try { const preset = JSON.parse(await file.text()); const result = await api("/api/import/validate", { method: "POST", body: JSON.stringify({ themeId: state.themeId, preset }) }); pushHistory(); Object.assign(state.draft, result.values); renderControls(); syncPreview(); setDirtyState(); toast("Preset importé en prévisualisation."); } catch (error) { toast(error.message); } event.target.value = ""; }

$("#theme-select").addEventListener("change", event => loadTheme(event.target.value).catch(error => toast(error.message)));
$("#mode-select").addEventListener("change", event => { state.mode = event.target.value; renderControls(); syncPreview(); });
$("#variant-select").addEventListener("change", syncPreview); $("#viewport-select").addEventListener("change", () => { if ($("#viewport-select").value === "custom") { const width = Number(prompt("Largeur personnalisée", state.customViewport.width)); const height = Number(prompt("Hauteur personnalisée", state.customViewport.height)); if (Number.isFinite(width) && width > 200 && Number.isFinite(height) && height > 200) state.customViewport = { width, height }; } syncViewport(); }); $("#background-select").addEventListener("change", syncPreview); window.addEventListener("resize", syncViewport); if (typeof ResizeObserver === "function") new ResizeObserver(syncViewport).observe($(".preview-wrap")); $("#preview").addEventListener("load", syncPreview); $("#import-file").addEventListener("change", readImport); $("#wallpaper-file").addEventListener("change", event => { const file = event.target.files[0]; if (file) { state.wallpaper = `url(${JSON.stringify(URL.createObjectURL(file))}) center / cover`; syncPreview(); } });
document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", async () => { try { const action = button.dataset.action; if (action === "reset") resetAll(); if (action === "diff" || action === "save") await showDiff(); if (action === "apply") await applyDiff(); if (action === "reload") { if (!hasChanges() || confirm("Des modifications non sauvegardées seront perdues. Recharger ?")) await loadTheme(state.themeId); } if (action === "duplicate") await duplicateTheme(); if (action === "new") await createTheme(); if (action === "import") importPreset(); if (action === "export") exportPreset(); if (action === "upload-wallpaper") $("#wallpaper-file").click(); if (action === "clear-wallpaper") { state.wallpaper = ""; syncPreview(); } } catch (error) { toast(error.message); } }));
$("#apply-button").addEventListener("click", applyDiff); document.addEventListener("keydown", event => { if ((event.metaKey || event.ctrlKey) && event.key === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); } if ((event.metaKey || event.ctrlKey) && event.key === "y") { event.preventDefault(); redo(); } });

async function boot() { const result = await api("/api/themes"); state.themes = result.themes; state.themeId = result.themes.find(theme => theme.id === "ios")?.id || result.themes[0]?.id; renderThemeOptions(); await loadTheme(state.themeId); $("#preview").src = `/preview/dev.html?theme-studio=${Date.now()}`; }
boot().catch(error => toast(error.message));
