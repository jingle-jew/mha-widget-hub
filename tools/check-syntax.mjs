import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const roots = [
  "mha-widget-hub-loader.js",
  "mha-admin-loader.js",
  "mha-diagnostics-loader.js",
  "mha-widget-hub.js",
  "src",
  "tools",
  "tests",
];

async function collectJavaScriptFiles(entry) {
  const absolutePath = path.join(repoRoot, entry);
  const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => null);

  if (!entries) {
    return /\.(?:js|mjs)$/.test(entry) ? [entry] : [];
  }

  const files = await Promise.all(entries.map((item) => {
    if (item.name === ".DS_Store") return [];
    return collectJavaScriptFiles(path.join(entry, item.name));
  }));

  return files.flat();
}

const files = (await Promise.all(roots.map(collectJavaScriptFiles)))
  .flat()
  .sort();

const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failures.push(`${file}\n${result.stderr || result.stdout}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Syntax checked: ${files.length} JavaScript files`);
}
