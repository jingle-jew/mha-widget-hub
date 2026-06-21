const DIAGNOSTICS_BOOT_STYLE_ID = "mha-diagnostics-boot-style";

if (!document.getElementById(DIAGNOSTICS_BOOT_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = DIAGNOSTICS_BOOT_STYLE_ID;
  style.textContent = `
    mha-diagnostics-panel:not(:defined) {
      display: block;
      inline-size: 100%;
      min-block-size: 100dvh;
      background: linear-gradient(135deg, #171b30, #242844);
    }
  `;
  document.head.append(style);
}

const diagnosticsUrl = new URL("./src/diagnostics/diagnostics-panel.js", import.meta.url);
const frontendVersion = new URL(import.meta.url).searchParams.get("v");
if (frontendVersion) diagnosticsUrl.searchParams.set("v", frontendVersion);

import(diagnosticsUrl.href).catch(error => {
  console.error("[MHA Insights] Failed to load the diagnostics panel.", error);
  document.getElementById(DIAGNOSTICS_BOOT_STYLE_ID)?.remove();
});
