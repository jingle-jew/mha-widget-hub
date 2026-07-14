import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { buildDiff } from "./diff-service.js";
import { buildThemeCreationPlan, applyThemeCreationPlan } from "./theme-generator.js";
import { getAllowedFiles, readTheme } from "./theme-reader.js";
import { validateImportPreset, validateCssValue } from "./theme-validator.js";
import { applyThemeChanges } from "./theme-writer.js";
import { resolveRepoFile, validateThemeId } from "./repo-guard.js";
import { getControlById } from "../schema/theme-controls.js";

const MIME = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

function jsonResponse(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Payload trop volumineux.");
  }
  return body ? JSON.parse(body) : {};
}

function publicThemeData(data) {
  return { ...data, files: data.files.map(({ content, ...file }) => file), registry: data.registry ? (({ content, ...file }) => file)(data.registry) : null };
}

async function servePreview(response, repoRoot, requestPath) {
  const relative = requestPath.replace(/^\/preview\/?/, "") || "dev.html";
  if (relative.includes("..") || relative.startsWith("/") || !(/^(dev\.html|mha-widget-hub-loader\.js|mha-widget-hub\.js|src\/|styles\/|assets\/)/.test(relative))) {
    response.writeHead(404); response.end("Not found"); return;
  }
  const absolute = path.resolve(repoRoot, relative);
  const root = path.resolve(repoRoot);
  if (!absolute.startsWith(`${root}${path.sep}`)) { response.writeHead(404); response.end("Not found"); return; }
  const content = await readFile(absolute).catch(() => null);
  if (!content) { response.writeHead(404); response.end("Not found"); return; }
  response.writeHead(200, { "content-type": MIME[path.extname(relative)] || "application/octet-stream", "cache-control": "no-store" });
  response.end(content);
}

export function createRoutes({ repoRoot, clientRoot, themes }) {
  return async function handle(request, response) {
    const url = new URL(request.url, "http://127.0.0.1");
    try {
      if (url.pathname.startsWith("/preview/")) return servePreview(response, repoRoot, url.pathname);
      if (request.method === "GET" && url.pathname === "/api/themes") return jsonResponse(response, 200, { themes });
      if (request.method === "GET" && url.pathname.startsWith("/api/themes/")) {
        const themeId = validateThemeId(url.pathname.split("/").pop());
        return jsonResponse(response, 200, publicThemeData(await readTheme(repoRoot, themeId)));
      }
      if (request.method === "POST" && url.pathname === "/api/diff") {
        const body = await readJson(request);
        return jsonResponse(response, 200, await buildDiff(repoRoot, validateThemeId(body.themeId), body.values || {}, body.mode || "dark"));
      }
      if (request.method === "POST" && url.pathname === "/api/apply") {
        const body = await readJson(request);
        return jsonResponse(response, 200, await applyThemeChanges(repoRoot, validateThemeId(body.themeId), body.values || {}, body.mode || "dark", body.snapshots || []));
      }
      if (request.method === "POST" && url.pathname === "/api/create-plan") {
        const body = await readJson(request);
        return jsonResponse(response, 200, await buildThemeCreationPlan(repoRoot, body));
      }
      if (request.method === "POST" && url.pathname === "/api/create-apply") {
        const body = await readJson(request);
        return jsonResponse(response, 200, await applyThemeCreationPlan(repoRoot, body.plan));
      }
      if (request.method === "POST" && url.pathname === "/api/import/validate") {
        const body = await readJson(request);
        const themeId = validateThemeId(body.themeId);
        const known = new Map();
        const data = await readTheme(repoRoot, themeId);
        for (const item of data.controls) known.set(item.token, [...(known.get(item.token) || []), item]);
        const validated = validateImportPreset(body.preset, new Set(known.keys()));
        const values = {};
        for (const [mode, tokens] of Object.entries(validated)) for (const [token, value] of Object.entries(tokens)) {
          const definition = known.get(token)?.find(item => item.mode === "shared" || item.mode === mode);
          if (definition?.mode === "shared" || definition?.mode === mode) values[definition.id] = validateCssValue(definition, value);
        }
        return jsonResponse(response, 200, { values });
      }
      if (request.method === "GET" && url.pathname === "/") {
        const html = await readFile(path.join(clientRoot, "index.html"), "utf8");
        response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); response.end(html); return;
      }
      if (request.method === "GET") {
        const relative = url.pathname.replace(/^\//, "");
        if (!relative.includes("..")) {
          const file = await readFile(path.join(clientRoot, relative)).catch(() => null);
          if (file) { response.writeHead(200, { "content-type": MIME[path.extname(relative)] || "application/octet-stream", "cache-control": "no-store" }); response.end(file); return; }
        }
      }
      response.writeHead(404); response.end("Not found");
    } catch (error) {
      const status = error.code === "FILE_CONFLICT" ? 409 : 400;
      jsonResponse(response, status, { error: error.message || "Erreur Theme Studio." });
    }
  };
}
