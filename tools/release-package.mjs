import { mkdir, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  buildIntegrationPackage,
  listTreeFiles,
  REPO_ROOT,
} from "./frontend-package.mjs";

export async function createReleaseZip({
  sourceRoot = REPO_ROOT,
  stageRoot = path.join(sourceRoot, "dist", "release"),
  output = path.join(sourceRoot, "dist", "mha-widget-hub.zip"),
  hacsOutput = path.join(sourceRoot, "dist", "mha-widget-hub-hacs.zip"),
} = {}) {
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });

  const integrationRoot = path.join(
    stageRoot,
    "custom_components",
    "mha_widget_hub",
  );
  await buildIntegrationPackage(integrationRoot, { sourceRoot });

  async function zipDirectory(root, destination) {
    const entries = await listTreeFiles(root);
    if (!entries.length) throw new Error(`No files found for release zip in ${root}.`);

    await mkdir(path.dirname(destination), { recursive: true });
    await rm(destination, { force: true });
    const zip = spawnSync("zip", ["-q", "-X", destination, ...entries], {
      cwd: root,
      encoding: "utf8",
    });

    if (zip.error) throw new Error(`Unable to create release zip: ${zip.error.message}`);
    if (zip.status !== 0) {
      throw new Error(zip.stderr || zip.stdout || `zip exited with status ${zip.status}`);
    }

    return (await stat(destination)).size;
  }

  const size = await zipDirectory(stageRoot, output);
  const hacsSize = await zipDirectory(integrationRoot, hacsOutput);
  return { output, size, hacsOutput, hacsSize, stageRoot };
}
