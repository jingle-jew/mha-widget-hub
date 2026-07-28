import path from "node:path";

export function normalizeDeployPath(value) {
  const normalized = path.posix.normalize(String(value || "").replace(/\/+$/, ""));
  if (!path.posix.isAbsolute(normalized) || normalized === "/") {
    throw new Error(`MHA_DEPLOY_PATH must be an absolute integration directory: ${value}`);
  }
  if (path.posix.basename(normalized) !== "mha_widget_hub") {
    throw new Error(`MHA_DEPLOY_PATH must end with /mha_widget_hub: ${value}`);
  }
  return normalized;
}

export function quoteRemoteShell(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

export function createRemoteWritableCheck(remotePath) {
  const target = quoteRemoteShell(normalizeDeployPath(remotePath));
  return `mkdir -p -- ${target} 2>/dev/null && test -w ${target} && test -z "$(find ${target} -type d ! -writable -print -quit)"`;
}

export function createRemotePreparationCommand(remotePath, { nonInteractive = false } = {}) {
  const target = quoteRemoteShell(normalizeDeployPath(remotePath));
  const sudo = nonInteractive ? "sudo -n" : "sudo";
  return [
    "deploy_uid=$(id -u)",
    "deploy_gid=$(id -g)",
    `${sudo} install -d -o "$deploy_uid" -g "$deploy_gid" -- ${target}`,
    `${sudo} chown -R "$deploy_uid:$deploy_gid" -- ${target}`,
  ].join(" && ");
}

export function createSshArgs({ port, remote, command, tty = false }) {
  return [
    ...(tty ? ["-t"] : []),
    "-p",
    String(port),
    remote,
    command,
  ];
}
