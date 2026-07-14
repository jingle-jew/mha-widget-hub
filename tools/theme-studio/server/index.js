import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRoutes } from "./routes.js";
import { getRegisteredThemes } from "./theme-reader.js";

const serverRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverRoot, "../../..");
const clientRoot = path.resolve(serverRoot, "../client");
const port = Number(process.env.THEME_STUDIO_PORT || 4173);
const host = "127.0.0.1";

const server = http.createServer(createRoutes({ repoRoot, clientRoot, themes: getRegisteredThemes() }));
server.listen(port, host, () => {
  console.log(`Theme Studio MHA prêt: http://${host}:${port}`);
  console.log("Le serveur écoute uniquement sur 127.0.0.1. Arrêt: Ctrl+C");
});

function shutdown(signal) {
  console.log(`\nArrêt du Theme Studio (${signal}).`);
  server.close(() => process.exit(0));
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
