import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.(?:css|js)$/.test(entry.name) ? [entryPath] : [];
  });
}

test("MHA typography exposes one centralized lighter weight scale", () => {
  const tokens = readFileSync(path.join(projectRoot, "styles/core/tokens.css"), "utf8");
  assert.match(tokens, /--mha-font-weight-regular:400;/);
  assert.match(tokens, /--mha-font-weight-medium:500;/);
  assert.match(tokens, /--mha-font-weight-semibold:550;/);
  assert.match(tokens, /--mha-font-weight-bold:600;/);
  assert.match(tokens, /--mha-font-weight-heavy:650;/);
  assert.match(tokens, /--mha-font-weight-extra-bold:700;/);
  assert.match(tokens, /--mha-font-weight-black:800;/);
  assert.match(tokens, /:host strong,:host b\{font-weight:var\(--mha-font-weight-bold\)\}/);
});

test("MHA components do not hardcode font weights outside the global scale", () => {
  const files = [
    ...collectSourceFiles(path.join(projectRoot, "styles")),
    ...collectSourceFiles(path.join(projectRoot, "src")),
  ];
  const weightDeclaration = /(?:font-weight|--[\w-]*(?:font-weight|weight))\s*:\s*([^;}]+)/g;
  const violations = [];

  files.forEach((file) => {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(weightDeclaration)) {
      if (/(?:^|[\s,(])(?:[1-9]\d{2}|bold|bolder)(?=$|[\s,)])/.test(match[1])) {
        violations.push(`${path.relative(projectRoot, file)}: ${match[0]}`);
      }
    }
  });

  assert.deepEqual(violations, []);
});
