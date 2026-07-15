import path from "node:path";
import { buildIntegrationPackage, REPO_ROOT } from "./frontend-package.mjs";

const outputRoot = path.join(
  REPO_ROOT,
  "dist",
  "integration",
  "custom_components",
  "mha_widget_hub",
);

await buildIntegrationPackage(outputRoot);
console.log(`Built Home Assistant integration at ${path.relative(REPO_ROOT, outputRoot)}`);
