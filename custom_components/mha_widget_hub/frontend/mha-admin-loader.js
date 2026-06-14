const ADMIN_BOOT_STYLE_ID = "mha-admin-boot-style";

if (!document.getElementById(ADMIN_BOOT_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = ADMIN_BOOT_STYLE_ID;
  style.textContent = `
    mha-admin-panel:not(:defined) {
      display: block;
      inline-size: 100%;
      block-size: 100dvh;
      background: linear-gradient(135deg, #171b30, #242844);
    }
  `;
  document.head.append(style);
}

const adminUrl = new URL("./src/admin/admin-panel.js", import.meta.url);
const frontendVersion = new URL(import.meta.url).searchParams.get("v");
if (frontendVersion) adminUrl.searchParams.set("v", frontendVersion);

import(adminUrl.href).catch(error => {
  console.error("[MHA Admin] Failed to load the admin panel.", error);
  document.getElementById(ADMIN_BOOT_STYLE_ID)?.remove();
});
