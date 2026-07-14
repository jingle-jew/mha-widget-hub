import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFrontendSources } from "./frontend-package.mjs";
import { INTEGRATION_FRONTEND } from "./frontend-files.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const frontendRoot = path.join(repoRoot, INTEGRATION_FRONTEND);

await copyFrontendSources(frontendRoot);
console.log(`Generated local integration frontend at ${frontendRoot}`);
