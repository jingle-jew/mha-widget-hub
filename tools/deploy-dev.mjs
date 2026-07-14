import { mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntegrationPackage } from "./frontend-package.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const host = process.env.MHA_DEPLOY_HOST || "10.0.0.10";
const user = process.env.MHA_DEPLOY_USER || "julien";
const port = process.env.MHA_DEPLOY_PORT || "22";
const remotePath = process.env.MHA_DEPLOY_PATH
  || "/var/lib/homeassistant/homeassistant/custom_components/mha_widget_hub";
const integrationSource = path.resolve(
  repoRoot,
  process.env.MHA_DEPLOY_SOURCE || "custom_components/mha_widget_hub",
);

if (!host) {
  console.error(`Missing MHA_DEPLOY_HOST.

Example:
  MHA_DEPLOY_HOST=10.0.0.10 MHA_DEPLOY_USER=julien npm run deploy:dev

Optional:
  MHA_DEPLOY_PORT=22
  MHA_DEPLOY_PATH=/var/lib/homeassistant/homeassistant/custom_components/mha_widget_hub
  MHA_DEPLOY_SOURCE=custom_components/mha_widget_hub
`);
  process.exit(1);
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mha-deploy-"));

try {
  const stagedIntegration = path.join(temporaryRoot, "mha_widget_hub");
  await buildIntegrationPackage(stagedIntegration, { integrationSource });

  const destination = `${user ? `${user}@` : ""}${host}:${remotePath.replace(/\/$/, "")}/`;
  const args = [
    "-az",
    "--delete",
    "--exclude=.DS_Store",
    "--exclude=__MACOSX",
    "--exclude=__pycache__/",
    "--exclude=*.py[cod]",
    "-e",
    `ssh -p ${port}`,
    `${stagedIntegration}/`,
    destination,
  ];

  console.log(`Deploying generated integration to ${destination}`);
  const result = spawnSync("rsync", args, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) throw new Error(`Unable to run rsync: ${result.error.message}`);
  if (result.status !== 0) process.exitCode = result.status || 1;
  else {
    console.log("Deploy complete. Refresh Home Assistant in the browser. Restart HA only if backend integration files changed.");
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
