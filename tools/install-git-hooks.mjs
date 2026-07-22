import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const hooksDir = path.join(repoRoot, ".git", "hooks");

if (!existsSync(path.join(repoRoot, ".git"))) {
  console.error("Cannot install hooks: .git directory not found.");
  process.exit(1);
}

mkdirSync(hooksDir, { recursive: true });

installHook("pre-commit", `#!/usr/bin/env bash
set -euo pipefail
node tools/check-secrets.mjs --staged
`);

installHook("pre-push", `#!/usr/bin/env bash
set -euo pipefail
node tools/check-secrets.mjs --pre-push "$@"
`);

console.log("Installed Git hooks: pre-commit, pre-push.");

function installHook(name, body) {
  const hookPath = path.join(hooksDir, name);
  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");
    if (existing !== body && !existing.includes("tools/check-secrets.mjs")) {
      const backupPath = `${hookPath}.backup-${Date.now()}`;
      writeFileSync(backupPath, existing);
      console.log(`Backed up existing ${name} hook to ${backupPath}.`);
    }
  }

  writeFileSync(hookPath, body);
  chmodSync(hookPath, 0o755);
}
