import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

const files = [
  "tools/theme-studio/server/index.js",
  "tools/theme-studio/server/routes.js",
  "tools/theme-studio/server/repo-guard.js",
  "tools/theme-studio/server/theme-parser.js",
  "tools/theme-studio/server/theme-reader.js",
  "tools/theme-studio/server/theme-validator.js",
  "tools/theme-studio/server/theme-writer.js",
  "tools/theme-studio/server/theme-generator.js",
  "tools/theme-studio/schema/theme-controls.js",
  "tools/theme-studio/client/app.js",
];

for (const file of files) {
  await access(file);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Syntaxe invalide: ${file}`)));
    child.once("error", reject);
  });
}
console.log(`Theme Studio syntax OK (${files.length} fichiers)`);
