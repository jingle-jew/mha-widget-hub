import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  copyFrontendSources,
  validateFrontendPackage,
} from "./frontend-package.mjs";

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mha-frontend-check-"));

try {
  const frontendRoot = path.join(temporaryRoot, "frontend");
  await copyFrontendSources(frontendRoot);
  await validateFrontendPackage(frontendRoot);
  console.log("Frontend package matches canonical sources");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
