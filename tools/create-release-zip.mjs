import path from "node:path";
import { REPO_ROOT } from "./frontend-package.mjs";
import { createReleaseZip } from "./release-package.mjs";

const result = await createReleaseZip();
console.log(
  `Created ${path.relative(REPO_ROOT, result.output)} (${Math.round(result.size / 1024)} KB)`,
);
console.log(
  `Created ${path.relative(REPO_ROOT, result.hacsOutput)} for HACS (${Math.round(result.hacsSize / 1024)} KB)`,
);
