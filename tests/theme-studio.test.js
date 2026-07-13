import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseDeclarations, applyDeclarationChanges, findDeclaration } from "../tools/theme-studio/server/theme-parser.js";
import { validateCssValue, validateImportPreset } from "../tools/theme-studio/server/theme-validator.js";
import { readTheme } from "../tools/theme-studio/server/theme-reader.js";
import { applyThemeChanges } from "../tools/theme-studio/server/theme-writer.js";
import { buildThemeCreationPlan, applyThemeCreationPlan } from "../tools/theme-studio/server/theme-generator.js";
import { getStyleManifest } from "../src/styles/style-manifest.js";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mha-theme-studio-"));
  await mkdir(path.join(root, "styles/themes"), { recursive: true });
  await mkdir(path.join(root, "src/settings"), { recursive: true });
  const css = `:host([data-theme-style="oneui"]) {\n  --mha-widget-radius: 28px;\n  --mha-control-radius: 999px;\n  --mha-dock-radius: 24px;\n  --mha-surface-blur: 24px;\n  --mha-surface-saturation: 145%;\n  --mha-glass-noise-opacity: .046;\n  --mha-glass-noise-blend-mode: overlay;\n}\n:host([data-theme-style="oneui"][data-theme="light"]) {\n  --mha-text: rgba(0,0,0,.88);\n  --mha-widget-border: rgba(110,92,78,.12);\n}\n:host([data-theme-style="oneui"][data-theme="dark"]) {\n  --mha-text: rgba(255,255,255,.96);\n  --mha-widget-border: rgba(255,236,219,.18);\n}\n`;
  await writeFile(path.join(root, "styles/themes/oneui.css"), css);
  await writeFile(path.join(root, "src/settings/theme-registry.js"), "  alexa: normalizeThemeDefinition({\n  }),\n");
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test("parser preserves CSS outside a targeted declaration", () => {
  const source = ":host {\n  --mha-a: 1px;\n  color: red;\n}\n";
  const declaration = findDeclaration(source, { token: "--mha-a", selector: ":host" });
  const next = applyDeclarationChanges(source, [{ token: "--mha-a", selector: ":host", declaration, value: "2px" }]);
  assert.match(next, /--mha-a: 2px/);
  assert.match(next, /color: red/);
  assert.equal(parseDeclarations(next).length, 1);
});

test("CSS values and import presets are allowlisted", () => {
  assert.equal(validateCssValue({ label: "Blur", control: "range", min: 0, max: 40, unit: "px" }, "14px"), "14px");
  assert.throws(() => validateCssValue({ label: "Blur", control: "range", min: 0, max: 40, unit: "px" }, "80px"));
  assert.throws(() => validateImportPreset({ schemaVersion: 1, overrides: { shared: { "--not-authorized": "1px" } } }, new Set()));
});

test("integration reads, diffs, writes and rereads a fixture theme", async t => {
  const { root, cleanup } = await fixture();
  t.after(cleanup);
  const initial = await readTheme(root, "oneui");
  const radius = initial.controls.find(control => control.id === "radius.widget");
  assert.equal(radius.value, "28px");
  const result = await applyThemeChanges(root, "oneui", { "radius.widget": "32px" }, "dark", initial.files.map(({ path: filePath, sha256 }) => ({ path: filePath, sha256 })));
  assert.equal(result.applied, true);
  const reread = await readTheme(root, "oneui");
  assert.equal(reread.controls.find(control => control.id === "radius.widget").value, "32px");
  assert.match(await readFile(path.join(root, "styles/themes/oneui.css"), "utf8"), /--mha-control-radius: 999px/);
});

test("external file changes are detected before writing", async t => {
  const { root, cleanup } = await fixture();
  t.after(cleanup);
  const initial = await readTheme(root, "oneui");
  await writeFile(path.join(root, "styles/themes/oneui.css"), `${(await readFile(path.join(root, "styles/themes/oneui.css"), "utf8"))}\n/* external change */\n`);
  await assert.rejects(() => applyThemeChanges(root, "oneui", { "radius.widget": "32px" }, "dark", initial.files.map(({ path: filePath, sha256 }) => ({ path: filePath, sha256 }))), /a changé/);
});

test("theme generation creates source CSS and registry plan without touching real files", async t => {
  const { root, cleanup } = await fixture();
  t.after(cleanup);
  const plan = await buildThemeCreationPlan(root, { sourceTheme: "oneui", newId: "studio-copy", label: "Studio Copy", includeDock: false });
  assert.deepEqual(plan.files.map(file => file.path), ["styles/themes/studio-copy.css", "src/settings/theme-registry.js"]);
  await applyThemeCreationPlan(root, plan);
  assert.match(await readFile(path.join(root, "styles/themes/studio-copy.css"), "utf8"), /data-theme-style="studio-copy"/);
  assert.match(await readFile(path.join(root, "src/settings/theme-registry.js"), "utf8"), /studio-copy/);
});

test("production style manifest does not include Theme Studio", () => {
  assert.equal(getStyleManifest().some(([filePath]) => filePath.includes("theme-studio")), false);
});

test("iOS controls point at raw material sources instead of aliases", async () => {
  const data = await readTheme(process.cwd(), "ios");
  const surface = data.controls.find(control => control.id === "ios.surface.dark");
  assert.equal(surface.file, "styles/themes/ios-raw-materials.css");
  assert.equal(surface.available, true);
  assert.equal(surface.value, "rgba(255,255,255,.12)");
});

test("catalogue all native theme tokens and excludes compatibility aliases", async () => {
  const data = await readTheme(process.cwd(), "oneui");
  assert.ok(data.controls.length > 100);
  assert.equal(data.files.some(file => file.path === "styles/core/surface-contract/aliases.css"), false);
  assert.ok(data.controls.some(control => control.readOnly));
  assert.ok(data.controls.some(control => !control.readOnly && control.file === "styles/themes/oneui.css"));
});
