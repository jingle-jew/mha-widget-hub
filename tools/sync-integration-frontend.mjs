import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const integrationRoot = path.join(
  repoRoot,
  "custom_components",
  "mha_widget_hub",
);
const frontendRoot = path.join(integrationRoot, "frontend");

const frontendSources = [
  ["mha-control-hub.js", "mha-control-hub.js"],
  ["src", "src"],
  ["styles", "styles"],
  ["assets", "assets"],
];

await rm(frontendRoot, { recursive: true, force: true });
await mkdir(frontendRoot, { recursive: true });

for (const [source, destination] of frontendSources) {
  await cp(
    path.join(repoRoot, source),
    path.join(frontendRoot, destination),
    {
      recursive: true,
      filter: (entry) => path.basename(entry) !== ".DS_Store",
    },
  );
}

const brandRoot = path.join(integrationRoot, "brand");
await mkdir(brandRoot, { recursive: true });
await cp(
  path.join(repoRoot, "assets", "brand", "mha-widget-hub-icon.png"),
  path.join(brandRoot, "icon.png"),
);

console.log(`Synced integration frontend to ${frontendRoot}`);
