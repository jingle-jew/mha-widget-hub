import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildIntegrationPackage,
  copyFrontendSources,
  listTreeFiles,
  REPO_ROOT,
  validateFrontendPackage,
  validateIntegrationPackage,
} from "../tools/frontend-package.mjs";
import { createReleaseZip } from "../tools/release-package.mjs";

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("frontend generation replaces stale content and matches canonical sources byte-for-byte", async (t) => {
  const temporaryRoot = await temporaryDirectory(t, "mha-frontend-test-");
  const destination = path.join(temporaryRoot, "frontend");
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, "obsolete.js"), "obsolete");

  await copyFrontendSources(destination);
  await validateFrontendPackage(destination);

  assert.equal(await readFile(path.join(destination, "mha-widget-hub.js"), "utf8"), await readFile(path.join(REPO_ROOT, "mha-widget-hub.js"), "utf8"));
  assert.equal((await listTreeFiles(destination)).some(file => file.endsWith(".DS_Store")), false);
  await assert.rejects(readFile(path.join(destination, "obsolete.js")), { code: "ENOENT" });
});

test("frontend generation reports a missing required source clearly", async (t) => {
  const temporaryRoot = await temporaryDirectory(t, "mha-missing-source-");
  await assert.rejects(
    copyFrontendSources(path.join(temporaryRoot, "frontend"), {
      sourceRoot: temporaryRoot,
      sources: [["missing-entrypoint.js", "missing-entrypoint.js"]],
    }),
    /Missing required frontend source: missing-entrypoint\.js/,
  );
});

test("integration staging contains the complete Home Assistant package", async (t) => {
  const temporaryRoot = await temporaryDirectory(t, "mha-integration-test-");
  const integrationRoot = path.join(temporaryRoot, "custom_components", "mha_widget_hub");

  await buildIntegrationPackage(integrationRoot);
  await validateIntegrationPackage(integrationRoot);

  for (const entry of [
    "manifest.json",
    "__init__.py",
    "frontend/mha-widget-hub.js",
    "frontend/mha-widget-hub-loader.js",
    "frontend/mha-admin-loader.js",
    "frontend/mha-diagnostics-loader.js",
  ]) {
    assert.equal((await readFile(path.join(integrationRoot, entry))).length > 0, true, entry);
  }
  for (const directory of ["frontend/src", "frontend/styles", "frontend/assets"]) {
    assert.equal((await readdir(path.join(integrationRoot, directory))).length > 0, true, directory);
  }
  assert.equal((await readdir(path.join(integrationRoot, "brand"))).length > 0, true, "brand");
});

test("package check is temporary and does not change the working tree", async (t) => {
  const temporaryRoot = await temporaryDirectory(t, "mha-check-tmp-");
  const gitStatus = () => spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).stdout;
  const before = gitStatus();
  const result = spawnSync(process.execPath, ["tools/check-frontend-package.mjs"], {
    cwd: REPO_ROOT,
    env: { ...process.env, TMPDIR: temporaryRoot },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(gitStatus(), before);
  assert.deepEqual(await readdir(temporaryRoot), []);
});

test("release ZIP contains the installable integration and no discarded metadata", async (t) => {
  const temporaryRoot = await temporaryDirectory(t, "mha-release-test-");
  const output = path.join(temporaryRoot, "mha-widget-hub.zip");
  const hacsOutput = path.join(temporaryRoot, "mha-widget-hub-hacs.zip");
  const stageRoot = path.join(temporaryRoot, "release");
  await mkdir(stageRoot, { recursive: true });
  await writeFile(path.join(stageRoot, "obsolete.txt"), "obsolete");
  await createReleaseZip({ output, hacsOutput, stageRoot });

  const unzip = spawnSync("unzip", ["-Z1", output], { encoding: "utf8" });
  assert.equal(unzip.status, 0, unzip.stderr || unzip.stdout);
  const entries = new Set(unzip.stdout.trim().split("\n"));
  const prefix = "custom_components/mha_widget_hub/";

  for (const entry of [
    "manifest.json",
    "__init__.py",
    "frontend/mha-widget-hub.js",
    "frontend/mha-widget-hub-loader.js",
    "frontend/mha-admin-loader.js",
    "frontend/mha-diagnostics-loader.js",
  ]) {
    assert.equal(entries.has(`${prefix}${entry}`), true, entry);
  }
  for (const directory of ["frontend/src/", "frontend/styles/", "frontend/assets/"]) {
    assert.equal([...entries].some(entry => entry.startsWith(`${prefix}${directory}`)), true, directory);
  }
  assert.equal([...entries].some(entry => entry.includes(".DS_Store")), false);
  assert.equal(entries.has("obsolete.txt"), false);

  const hacsUnzip = spawnSync("unzip", ["-Z1", hacsOutput], { encoding: "utf8" });
  assert.equal(hacsUnzip.status, 0, hacsUnzip.stderr || hacsUnzip.stdout);
  const hacsEntries = new Set(hacsUnzip.stdout.trim().split("\n"));
  assert.equal(hacsEntries.has("manifest.json"), true);
  assert.equal(hacsEntries.has("__init__.py"), true);
  assert.equal(hacsEntries.has("frontend/mha-widget-hub.js"), true);
  assert.equal([...hacsEntries].some(entry => entry.startsWith("custom_components/")), false);

  const hacs = JSON.parse(await readFile(path.join(REPO_ROOT, "hacs.json"), "utf8"));
  assert.equal(hacs.zip_release, true);
  assert.equal(hacs.hide_default_branch, true);
  assert.equal(hacs.filename, path.basename(hacsOutput));
});
