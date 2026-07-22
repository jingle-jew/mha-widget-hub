import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

const ZERO_SHA = /^0{40}$/;
const MAX_FILE_BYTES = 1024 * 1024;

const secretPatterns = [
  {
    name: "OpenAI API key",
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "GitHub token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    name: "AWS access key id",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  },
  {
    name: "Stripe secret key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: "Home Assistant/JWT-style token",
    pattern: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
  },
  {
    name: "Private key block",
    pattern: /-----BEGIN (?:OPENSSH|RSA|DSA|EC|PGP|PRIVATE) PRIVATE KEY-----/g,
  },
];

const sensitiveAssignmentPattern = /^\s*(?:export\s+)?([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASS|API[_-]?KEY|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|WEBHOOK|AUTHORIZATION)[A-Z0-9_]*)\s*[:=]\s*['"]?([^'"\s#]{8,})/i;

const highRiskFilePatterns = [
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)secrets\.ya?ml$/i,
  /(^|\/)\.ssh(\/|$)/,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:$|[._-])/,
  /\.(?:pem|p12|pfx|key)$/i,
  /\.(?:token|secret)$/i,
];

const excludedPathPatterns = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)test-results\//,
  /(^|\/)package-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
];

const placeholderPattern = /^(?:x+|_+|\.{3}|<[^>]+>|\$\{[^}]+}|your[-_].*|example.*|sample.*|dummy.*|fake.*|test.*|changeme|replace[_-]?me|null|none|true|false)$/i;
const codeExpressionPattern = /^[a-z_$][\w$]*(?:\.[a-z_$][\w$]*)+,?$/i;

const args = process.argv.slice(2);
const findings = [];

main();

function main() {
  if (args.includes("--help")) {
    console.log(`Usage:
  node tools/check-secrets.mjs
  node tools/check-secrets.mjs --staged
  node tools/check-secrets.mjs --range <git-range>
  node tools/check-secrets.mjs --pre-push <remote-name> <remote-url>
`);
    return;
  }

  if (args.includes("--staged")) scanStagedFiles();
  else if (args.includes("--pre-push")) scanPrePush();
  else if (args.includes("--range")) scanExplicitRange();
  else scanWorktreeFiles();

  if (findings.length > 0) {
    console.error(formatFindings());
    process.exit(1);
  }

  console.log("Secret scan passed.");
}

function scanExplicitRange() {
  const range = args[args.indexOf("--range") + 1];
  if (!range) fail("Missing git range after --range.");
  scanCommitRange(range);
}

function scanPrePush() {
  const remoteName = args[args.indexOf("--pre-push") + 1] || "origin";
  const input = readFileSync(0, "utf8").trim();

  if (!input) {
    scanWorktreeFiles();
    return;
  }

  const ranges = new Set();
  for (const line of input.split(/\r?\n/)) {
    const [localRef, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
    if (!localSha || ZERO_SHA.test(localSha)) continue;
    if (remoteSha && !ZERO_SHA.test(remoteSha)) {
      ranges.add(`${remoteSha}..${localSha}`);
      continue;
    }

    const baseRef = resolveRemoteBase(remoteName, remoteRef, localSha);
    if (baseRef) ranges.add(`${baseRef}..${localSha}`);
    else scanTree(localSha, `${localRef || localSha}`);
  }

  for (const range of ranges) scanCommitRange(range);
  scanWorktreeFiles();
}

function scanWorktreeFiles() {
  for (const filePath of gitOutput(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0")) {
    if (!filePath || shouldExclude(filePath)) continue;
    if (isHighRiskFile(filePath)) {
      findings.push({
        source: "worktree",
        filePath,
        line: 1,
        type: "High-risk secret filename",
        match: path.basename(filePath),
      });
    }
    if (!existsSync(filePath) || lstatSync(filePath).isDirectory()) continue;
    const content = readSmallTextFile(filePath);
    if (content !== null) scanContent(content, filePath, "worktree");
  }
}

function scanStagedFiles() {
  for (const filePath of gitOutput(["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"]).split("\0")) {
    if (!filePath || shouldExclude(filePath)) continue;
    if (isHighRiskFile(filePath)) {
      findings.push({
        source: "staged",
        filePath,
        line: 1,
        type: "High-risk secret filename",
        match: path.basename(filePath),
      });
    }
    const content = gitMaybeOutput(["show", `:${filePath}`]);
    if (content !== null && isText(content)) scanContent(content, filePath, "staged");
  }
}

function scanCommitRange(range) {
  const commits = gitOutput(["rev-list", "--reverse", range]).trim().split(/\s+/).filter(Boolean);
  for (const commit of commits) scanTree(commit, commit);
}

function scanTree(commit, source) {
  const files = gitOutput(["ls-tree", "-r", "-z", "--name-only", commit]).split("\0");
  for (const filePath of files) {
    if (!filePath || shouldExclude(filePath)) continue;
    if (isHighRiskFile(filePath)) {
      findings.push({
        source,
        filePath,
        line: 1,
        type: "High-risk secret filename",
        match: path.basename(filePath),
      });
    }

    const size = Number(gitMaybeOutput(["cat-file", "-s", `${commit}:${filePath}`]) || 0);
    if (!Number.isFinite(size) || size > MAX_FILE_BYTES) continue;
    const content = gitMaybeOutput(["show", `${commit}:${filePath}`]);
    if (content !== null && isText(content)) scanContent(content, filePath, source);
  }
}

function scanContent(content, filePath, source) {
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const assignment = line.match(sensitiveAssignmentPattern);
    if (assignment && !isAllowedPlaceholder(assignment[2])) {
      findings.push({
        source,
        filePath,
        line: index + 1,
        type: `Sensitive assignment (${assignment[1]})`,
        match: redact(assignment[2]),
      });
    }
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const value = match[0];
      if (isAllowedPlaceholder(value)) continue;
      findings.push({
        source,
        filePath,
        line: lineNumberForIndex(content, match.index || 0),
        type: name,
        match: redact(value),
      });
    }
  }
}

function resolveRemoteBase(remoteName, remoteRef, localSha) {
  const branchName = remoteRef?.startsWith("refs/heads/")
    ? remoteRef.slice("refs/heads/".length)
    : "";
  const candidates = [
    branchName ? `refs/remotes/${remoteName}/${branchName}` : "",
    remoteDefaultRef(remoteName),
    `refs/remotes/${remoteName}/main`,
    `refs/remotes/${remoteName}/master`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (gitMaybeOutput(["rev-parse", "--verify", "--quiet", candidate]) === null) continue;
    const mergeBase = gitMaybeOutput(["merge-base", localSha, candidate])?.trim();
    if (mergeBase) return mergeBase;
  }
  return "";
}

function remoteDefaultRef(remoteName) {
  const ref = gitMaybeOutput(["symbolic-ref", "--quiet", `refs/remotes/${remoteName}/HEAD`])?.trim();
  return ref || "";
}

function readSmallTextFile(filePath) {
  const stats = lstatSync(filePath);
  if (!stats.isFile() || stats.size > MAX_FILE_BYTES) return null;
  const content = readFileSync(filePath, "utf8");
  return isText(content) ? content : null;
}

function shouldExclude(filePath) {
  return excludedPathPatterns.some(pattern => pattern.test(filePath));
}

function isHighRiskFile(filePath) {
  return highRiskFilePatterns.some(pattern => pattern.test(filePath));
}

function isText(content) {
  return !content.includes("\0");
}

function isAllowedPlaceholder(value) {
  const normalized = String(value).trim().replace(/^['"]|['"]$/g, "");
  if (normalized.length < 8) return true;
  return placeholderPattern.test(normalized) || codeExpressionPattern.test(normalized);
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function redact(value) {
  if (value.length <= 12) return "<redacted>";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function formatFindings() {
  const rows = findings.slice(0, 50).map(finding => (
    `- ${finding.type} in ${finding.filePath}:${finding.line} (${finding.source}) -> ${finding.match}`
  ));
  const suffix = findings.length > rows.length
    ? `\n… ${findings.length - rows.length} additional finding(s) hidden.`
    : "";
  return `Secret scan failed. Remove the sensitive value or rewrite the commit before pushing.\n${rows.join("\n")}${suffix}`;
}

function gitOutput(gitArgs) {
  const result = spawnSync("git", gitArgs, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  if (result.status !== 0) fail(result.stderr || `git ${gitArgs.join(" ")} failed`);
  return result.stdout;
}

function gitMaybeOutput(gitArgs) {
  const result = spawnSync("git", gitArgs, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  if (result.status !== 0) return null;
  return result.stdout;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
