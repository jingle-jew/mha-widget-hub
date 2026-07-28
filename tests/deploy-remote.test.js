import assert from "node:assert/strict";
import test from "node:test";
import {
  createRemotePreparationCommand,
  createRemoteWritableCheck,
  createSshArgs,
  normalizeDeployPath,
  quoteRemoteShell,
} from "../tools/deploy-remote.mjs";

test("deployment path validation only accepts the MHA integration directory", () => {
  assert.equal(
    normalizeDeployPath("/config/custom_components/mha_widget_hub/"),
    "/config/custom_components/mha_widget_hub",
  );
  assert.throws(() => normalizeDeployPath("/"), /absolute integration directory/);
  assert.throws(() => normalizeDeployPath("custom_components/mha_widget_hub"), /absolute integration directory/);
  assert.throws(() => normalizeDeployPath("/config/custom_components"), /must end with \/mha_widget_hub/);
});

test("remote deployment commands quote paths and scope ownership changes to the integration", () => {
  assert.equal(quoteRemoteShell("/tmp/Julien's MHA"), "'/tmp/Julien'\"'\"'s MHA'");

  const target = "/config/custom_components/mha_widget_hub";
  const check = createRemoteWritableCheck(target);
  assert.match(check, /mkdir -p/);
  assert.match(check, /find .* -type d ! -writable/);

  const prepare = createRemotePreparationCommand(target, { nonInteractive: true });
  assert.match(prepare, /sudo -n install -d/);
  assert.match(prepare, /sudo -n chown -R/);
  assert.match(prepare, /'\/config\/custom_components\/mha_widget_hub'/);
});

test("SSH arguments put pseudo-terminal allocation before the destination", () => {
  assert.deepEqual(createSshArgs({
    port: 2222,
    remote: "julien@ha.local",
    command: "true",
    tty: true,
  }), ["-t", "-p", "2222", "julien@ha.local", "true"]);
});
