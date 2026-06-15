import { mkdir, rm, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const distDir = path.join(repoRoot, "dist");
const output = path.join(distDir, "mha-widget-hub.zip");

const excluded = new Set([
  ".git",
  ".DS_Store",
  "__MACOSX",
  "node_modules",
  "dist",
]);

function isExcluded(relativePath) {
  return relativePath
    .split(path.sep)
    .some(part => excluded.has(part) || part.endsWith(".zip"));
}

await rm(output, { force: true });
await mkdir(distDir, { recursive: true });

const files = spawnSync("find", [".", "-type", "f"], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (files.status !== 0) {
  console.error(files.stderr || files.stdout);
  process.exit(files.status || 1);
}

const entries = files.stdout
  .trim()
  .split("\n")
  .filter(Boolean)
  .map(item => item.replace(/^\.\//, ""))
  .filter(item => !isExcluded(item))
  .sort();

if (!entries.length) {
  console.error("No files found for release zip.");
  process.exit(1);
}

const zip = spawnSync("zip", ["-q", "-r", output, ...entries], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (zip.status !== 0) {
  console.error(zip.stderr || zip.stdout);
  process.exit(zip.status || 1);
}

const info = await stat(output);
console.log(`Created ${path.relative(repoRoot, output)} (${Math.round(info.size / 1024)} KB)`);
