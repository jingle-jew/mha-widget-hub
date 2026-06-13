import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  BRAND_FILES,
  FRONTEND_SOURCES,
  INTEGRATION_FRONTEND,
} from "./frontend-files.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const frontendRoot = path.join(repoRoot, INTEGRATION_FRONTEND);

await rm(frontendRoot, { recursive: true, force: true });
await mkdir(frontendRoot, { recursive: true });

for (const [source, destination] of FRONTEND_SOURCES) {
  await cp(
    path.join(repoRoot, source),
    path.join(frontendRoot, destination),
    {
      recursive: true,
      filter: (entry) => path.basename(entry) !== ".DS_Store",
    },
  );
}

for (const [source, destination] of BRAND_FILES) {
  await mkdir(path.dirname(path.join(repoRoot, destination)), { recursive: true });
  await cp(path.join(repoRoot, source), path.join(repoRoot, destination));
}

console.log(`Synced integration frontend to ${frontendRoot}`);
