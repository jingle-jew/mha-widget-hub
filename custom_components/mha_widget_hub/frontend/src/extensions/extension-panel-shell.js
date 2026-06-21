function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMetric(label, value, hint = "") {
  return `
    <div class="mha-extension-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
}

export function renderCard(title, bodyHtml, { eyebrow = "", description = "" } = {}) {
  return `
    <article class="mha-extension-card">
      ${eyebrow ? `<p class="mha-extension-eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
      <h2>${escapeHtml(title)}</h2>
      ${description ? `<p class="mha-extension-card-description">${escapeHtml(description)}</p>` : ""}
      <div class="mha-extension-card-body">${bodyHtml}</div>
    </article>
  `;
}

export function renderExtensionPanelShell({
  title,
  eyebrow = "MHA extension panel",
  description = "",
  appearanceHtml = "",
  contentHtml = "",
} = {}) {
  return `
    <main class="mha-extension-shell">
      <header class="mha-extension-hero">
        <div>
          <p class="mha-extension-eyebrow">${escapeHtml(eyebrow)}</p>
          <h1>${escapeHtml(title)}</h1>
          ${description ? `<p class="mha-extension-description">${escapeHtml(description)}</p>` : ""}
        </div>
      </header>
      ${appearanceHtml}
      <section class="mha-extension-grid">${contentHtml}</section>
    </main>
  `;
}
