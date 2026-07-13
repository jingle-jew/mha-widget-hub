const DECLARATION_RE = /(--mha-[a-z0-9-]+)\s*:\s*([^;]+);/gi;

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function selectorBefore(text, index) {
  const opening = text.lastIndexOf("{", index);
  if (opening < 0) return "";
  const closing = text.lastIndexOf("}", opening);
  return text.slice(closing + 1, opening).trim();
}

export function parseDeclarations(text) {
  const declarations = [];
  for (const match of text.matchAll(DECLARATION_RE)) {
    const token = match[1];
    const value = match[2].trim();
    const selector = selectorBefore(text, match.index);
    declarations.push({
      token,
      value,
      selector,
      line: lineNumber(text, match.index),
      valueStart: match.index + match[0].indexOf(match[2]) + (match[2].length - match[2].trimStart().length),
      valueEnd: match.index + match[0].indexOf(match[2]) + match[2].trimEnd().length,
      matchStart: match.index,
      matchEnd: match.index + match[0].length,
    });
  }
  return declarations;
}

export function findDeclaration(text, { token, selector, line } = {}) {
  const candidates = parseDeclarations(text).filter(item => item.token === token);
  return candidates.find(item => item.selector.includes(selector) && (!line || item.line === line)) || null;
}

export function replaceDeclarationValue(text, declaration, value) {
  if (!declaration) throw new Error("Déclaration CSS introuvable.");
  return `${text.slice(0, declaration.valueStart)}${value}${text.slice(declaration.valueEnd)}`;
}

export function applyDeclarationChanges(text, changes) {
  const resolved = changes
    .map(change => ({ ...change, declaration: change.declaration || findDeclaration(text, change) }))
    .sort((a, b) => b.declaration.valueStart - a.declaration.valueStart);
  return resolved.reduce((current, change) => replaceDeclarationValue(current, change.declaration, change.value), text);
}

export function formatDiff(file, before, after) {
  const oldLines = before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);
  const lines = [`--- a/${file}`, `+++ b/${file}`];
  const length = Math.max(oldLines.length, newLines.length);
  for (let index = 0; index < length; index += 1) {
    if (oldLines[index] === newLines[index]) continue;
    if (oldLines[index] !== undefined) lines.push(`-${oldLines[index]}`);
    if (newLines[index] !== undefined) lines.push(`+${newLines[index]}`);
  }
  return lines.join("\n");
}
