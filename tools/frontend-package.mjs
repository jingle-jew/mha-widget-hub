import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FRONTEND_SOURCES,
  INTEGRATION_SOURCE,
  REQUIRED_FRONTEND_DIRECTORIES,
  REQUIRED_FRONTEND_FILES,
  REQUIRED_INTEGRATION_DIRECTORIES,
  REQUIRED_INTEGRATION_FILES,
} from "./frontend-files.mjs";

export const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

function isDiscardedName(name) {
  return name === ".DS_Store"
    || name === "__MACOSX"
    || name === "__pycache__"
    || /\.py[cod]$/.test(name);
}

function isFrontendSourceOnlyPath(source, relativePath) {
  const normalizedSource = String(source || "").split(path.sep).join("/");
  const normalizedRelativePath = String(relativePath || "").split(path.sep).join("/");
  return normalizedSource === "src"
    && (
      normalizedRelativePath === "assets/weather/png"
      || normalizedRelativePath.startsWith("assets/weather/png/")
    );
}

async function getEntryType(entry) {
  const entryStat = await stat(entry).catch(() => null);
  if (!entryStat) return null;
  if (entryStat.isFile()) return "file";
  if (entryStat.isDirectory()) return "directory";
  return "other";
}

function resolveDestination(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Frontend destination escapes its root: ${relativePath}`);
  }
  return resolved;
}

export async function listTreeFiles(root, { includeDiscarded = true } = {}) {
  const rootType = await getEntryType(root);
  if (!rootType) return [];
  if (rootType === "file") return [""];
  if (rootType !== "directory") return [];

  const files = [];

  async function visit(directory, relativeDirectory = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (!includeDiscarded && isDiscardedName(entry.name)) continue;
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await visit(root);
  return files;
}

async function collectExpectedFiles(sourceRoot, sources) {
  const expected = new Map();

  for (const [source, destination] of sources) {
    const sourcePath = path.resolve(sourceRoot, source);
    const sourceType = await getEntryType(sourcePath);
    if (!sourceType || sourceType === "other") {
      throw new Error(`Missing required frontend source: ${source}`);
    }

    if (sourceType === "file") {
      expected.set(destination, sourcePath);
      continue;
    }

    const files = await listTreeFiles(sourcePath, { includeDiscarded: false });
    for (const relativePath of files) {
      if (isFrontendSourceOnlyPath(source, relativePath)) continue;
      expected.set(path.join(destination, relativePath), path.join(sourcePath, relativePath));
    }
  }

  return expected;
}

export async function copyFrontendSources(
  destinationRoot,
  { sourceRoot = REPO_ROOT, sources = FRONTEND_SOURCES } = {},
) {
  await collectExpectedFiles(sourceRoot, sources);
  await rm(destinationRoot, { recursive: true, force: true });
  await mkdir(destinationRoot, { recursive: true });

  for (const [source, destination] of sources) {
    const sourcePath = path.resolve(sourceRoot, source);
    const destinationPath = resolveDestination(destinationRoot, destination);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, {
      recursive: true,
      filter: entry => {
        if (isDiscardedName(path.basename(entry))) return false;
        return !isFrontendSourceOnlyPath(source, path.relative(sourcePath, entry));
      },
    });
  }

  return destinationRoot;
}

async function assertEntryType(root, entry, expectedType, label) {
  const actualType = await getEntryType(path.join(root, entry));
  if (actualType !== expectedType) {
    throw new Error(`${label} is missing required ${expectedType}: ${entry}`);
  }
}

export async function validateFrontendPackage(
  destinationRoot,
  { sourceRoot = REPO_ROOT, sources = FRONTEND_SOURCES } = {},
) {
  for (const entry of REQUIRED_FRONTEND_FILES) {
    await assertEntryType(destinationRoot, entry, "file", "Frontend package");
  }
  for (const entry of REQUIRED_FRONTEND_DIRECTORIES) {
    await assertEntryType(destinationRoot, entry, "directory", "Frontend package");
  }

  const expected = await collectExpectedFiles(sourceRoot, sources);
  const actualFiles = await listTreeFiles(destinationRoot);
  const actual = new Set(actualFiles);
  const mismatches = [];

  for (const relativePath of [...expected.keys()].sort()) {
    if (!actual.has(relativePath)) {
      mismatches.push(`missing: ${relativePath}`);
      continue;
    }
    const [sourceContent, destinationContent] = await Promise.all([
      readFile(expected.get(relativePath)),
      readFile(path.join(destinationRoot, relativePath)),
    ]);
    if (!sourceContent.equals(destinationContent)) {
      mismatches.push(`different: ${relativePath}`);
    }
  }

  for (const relativePath of actualFiles) {
    if (!expected.has(relativePath)) mismatches.push(`extra: ${relativePath}`);
  }

  if (mismatches.length) {
    throw new Error(`Generated frontend does not match canonical sources:\n${mismatches.map(item => `- ${item}`).join("\n")}`);
  }

  return destinationRoot;
}

export async function validateIntegrationPackage(
  integrationRoot,
  { sourceRoot = REPO_ROOT } = {},
) {
  for (const entry of REQUIRED_INTEGRATION_FILES) {
    await assertEntryType(integrationRoot, entry, "file", "Home Assistant package");
  }
  for (const entry of REQUIRED_INTEGRATION_DIRECTORIES) {
    await assertEntryType(integrationRoot, entry, "directory", "Home Assistant package");
  }
  await validateFrontendPackage(path.join(integrationRoot, "frontend"), { sourceRoot });

  const discarded = (await listTreeFiles(integrationRoot))
    .filter(entry => entry.split(path.sep).some(isDiscardedName));
  if (discarded.length) {
    throw new Error(`Home Assistant package contains discarded files:\n${discarded.map(item => `- ${item}`).join("\n")}`);
  }

  return integrationRoot;
}

export async function buildIntegrationPackage(
  destinationRoot,
  {
    sourceRoot = REPO_ROOT,
    integrationSource = path.join(sourceRoot, INTEGRATION_SOURCE),
  } = {},
) {
  if (await getEntryType(integrationSource) !== "directory") {
    throw new Error(`Missing Home Assistant integration source: ${integrationSource}`);
  }

  await rm(destinationRoot, { recursive: true, force: true });
  await mkdir(path.dirname(destinationRoot), { recursive: true });
  const resolvedIntegrationSource = path.resolve(integrationSource);

  await cp(resolvedIntegrationSource, destinationRoot, {
    recursive: true,
    filter: entry => {
      const relativePath = path.relative(resolvedIntegrationSource, entry);
      const firstPart = relativePath.split(path.sep)[0];
      return firstPart !== "frontend" && !isDiscardedName(path.basename(entry));
    },
  });

  await copyFrontendSources(path.join(destinationRoot, "frontend"), { sourceRoot });
  await validateIntegrationPackage(destinationRoot, { sourceRoot });
  return destinationRoot;
}
