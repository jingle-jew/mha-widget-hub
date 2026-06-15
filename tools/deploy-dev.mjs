import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const host = process.env.MHA_DEPLOY_HOST || "10.0.0.10";
const user = process.env.MHA_DEPLOY_USER || "julien";
const port = process.env.MHA_DEPLOY_PORT || "22";
const remotePath = process.env.MHA_DEPLOY_PATH || "/var/lib/homeassistant/homeassistant/custom_components/mha_widget_hub";
const sourcePath = process.env.MHA_DEPLOY_SOURCE || "custom_components/mha_widget_hub/";

if (!host) {
  console.error(`Missing MHA_DEPLOY_HOST.

Example:
  MHA_DEPLOY_HOST=10.0.0.10 MHA_DEPLOY_USER=julien npm run deploy:dev

Optional:
  MHA_DEPLOY_PORT=22
  MHA_DEPLOY_PATH=/var/lib/homeassistant/homeassistant/custom_components/mha_widget_hub
  MHA_DEPLOY_SOURCE=custom_components/mha_widget_hub/
`);
  process.exit(1);
}

const destination = `${user ? `${user}@` : ""}${host}:${remotePath.replace(/\/$/, "")}/`;
const source = path.join(repoRoot, sourcePath);
const args = [
  "-az",
  "--delete",
  "--exclude=.DS_Store",
  "--exclude=__MACOSX",
  "-e",
  `ssh -p ${port}`,
  source,
  destination,
];

console.log(`Deploying ${sourcePath} to ${destination}`);
const result = spawnSync("rsync", args, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log("Deploy complete. Refresh Home Assistant in the browser. Restart HA only if backend integration files changed.");
