import test from "node:test";
import assert from "node:assert/strict";
import {
  GET_COMMAND,
  USERS_COMMAND,
  loadEntityVisibilityConfig,
  loadHomeAssistantUsers,
} from "../src/admin/entity-visibility-store.js";

test("missing first-install configuration normalizes to an empty valid config", async () => {
  const calls = [];
  const config = await loadEntityVisibilityConfig({
    async callWS(payload) {
      calls.push(payload);
      return null;
    },
  });

  assert.deepEqual(calls, [{ type: GET_COMMAND }]);
  assert.deepEqual(config, { version: 1, users: {} });
});

test("user loading sends the registered websocket command", async () => {
  const calls = [];
  const users = await loadHomeAssistantUsers({
    async callWS(payload) {
      calls.push(payload);
      return { users: [{ id: "user-1", name: "Julien" }] };
    },
  });

  assert.deepEqual(calls, [{ type: USERS_COMMAND }]);
  assert.deepEqual(users, [{ id: "user-1", name: "Julien" }]);
});

test("websocket failures retain their original code and message", async () => {
  const rawError = Object.assign(new Error("Handler exploded"), {
    code: "unknown_error",
  });
  const previousError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);

  try {
    await assert.rejects(
      loadEntityVisibilityConfig({
        async callWS() {
          throw rawError;
        },
      }),
      error => error === rawError,
    );
  } finally {
    console.error = previousError;
  }

  assert.equal(logs.length, 1);
  assert.equal(logs[0][1].type, GET_COMMAND);
  assert.equal(logs[0][1].raw, rawError);
  assert.equal(logs[0][1].message, "Handler exploded");
  assert.equal(logs[0][1].code, "unknown_error");
  assert.match(logs[0][1].stack, /Handler exploded/);
});
