import assert from "node:assert/strict";
import test from "node:test";
import {
  E2E_PORT,
  resolveWebPort,
  WEB_HOST,
  WEB_PORT,
} from "../apps/web/scripts/port-contract.mjs";

test("local web ports are deterministic", () => {
  assert.equal(WEB_HOST, "127.0.0.1");
  assert.equal(resolveWebPort("dev"), WEB_PORT);
  assert.equal(WEB_PORT, 5400);
  assert.equal(resolveWebPort("e2e"), E2E_PORT);
  assert.equal(E2E_PORT, 5401);
  assert.throws(() => resolveWebPort("unknown"), /Unknown web profile/);
});
