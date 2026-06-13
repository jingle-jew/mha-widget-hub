import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  BRAND_FILES,
  FRONTEND_SOURCES,
  INTEGRATION_FRONTEND,
} from "./frontend-files.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const frontendRoot = path.join(repoRoot, INTEGRATION_FRONTEND);
const checkOnly = process.argv.slice(2).includes("--check");

async function listFiles(entry) {
  const absolutePath = path.join(repoRoot, entry);
  const entryStat = await stat(absolutePath).catch(() => null);

  if (!entryStat) return [];
  if (entryStat.isFile()) return [""];

  const items = await readdir(absolutePath, { withFileTypes: true });
  const files = await Promise.all(items.map(async (item) => {
    if (item.name === ".DS_Store") return [];
    const childFiles = await listFiles(path.join(entry, item.name));
    return childFiles.map(child => path.join(item.name, child));
  }));

  return files.flat();
}

async function compareTrees(source, destination) {
  const [sourceFiles, destinationFiles] = await Promise.all([
    listFiles(source),
    listFiles(destination),
  ]);
  const sourceSet = new Set(sourceFiles);
  const destinationSet = new Set(destinationFiles);
  const allFiles = new Set([...sourceFiles, ...destinationFiles]);
  const mismatches = [];

  for (const relativePath of [...allFiles].sort()) {
    if (!sourceSet.has(relativePath)) {
      mismatches.push(`extra: ${path.join(destination, relativePath)}`);
      continue;
    }
    if (!destinationSet.has(relativePath)) {
      mismatches.push(`missing: ${path.join(destination, relativePath)}`);
      continue;
    }

    const [sourceContent, destinationContent] = await Promise.all([
      readFile(path.join(repoRoot, source, relativePath)),
      readFile(path.join(repoRoot, destination, relativePath)),
    ]);

    if (!sourceContent.equals(destinationContent)) {
      mismatches.push(`different: ${path.join(destination, relativePath)}`);
    }
  }

  return mismatches;
}

const comparisons = [
  ...FRONTEND_SOURCES.map(([source, destination]) => [
    source,
    path.join(INTEGRATION_FRONTEND, destination),
  ]),
  ...BRAND_FILES,
];

if (checkOnly) {
  const results = await Promise.all(
    comparisons.map(([source, destination]) => compareTrees(source, destination)),
  );
  const mismatches = results.flat();

  if (mismatches.length) {
    console.error("Integration frontend is out of sync:");
    mismatches.forEach(mismatch => console.error(`- ${mismatch}`));
    console.error("\nRun npm run sync:frontend to update the generated copy.");
    process.exitCode = 1;
  } else {
    console.log("Integration frontend is synchronized");
  }
} else {
  await rm(frontendRoot, { recursive: true, force: true });
  await mkdir(frontendRoot, { recursive: true });

  for (const [source, destination] of FRONTEND_SOURCES) {
    await cp(
      path.join(repoRoot, source),
      path.join(frontendRoot, destination),
      {
        recursive: true,
        filter: entry => path.basename(entry) !== ".DS_Store",
      },
    );
  }

  for (const [source, destination] of BRAND_FILES) {
    await mkdir(path.dirname(path.join(repoRoot, destination)), { recursive: true });
    await cp(path.join(repoRoot, source), path.join(repoRoot, destination));
  }

  console.log(`Synced integration frontend to ${frontendRoot}`);
}
