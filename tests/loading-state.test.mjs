import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginLoading,
  loadingSnapshot,
  withLoading,
} from "../src/lib/loading-state.ts";
test("loading threshold, overlap, minimum visibility and failures are handled without stale indicators", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  const fast = beginLoading();
  context.mock.timers.tick(299);
  assert.equal(loadingSnapshot(), false);
  fast();
  context.mock.timers.tick(1000);
  assert.equal(loadingSnapshot(), false);
  const first = beginLoading();
  context.mock.timers.tick(300);
  assert.equal(loadingSnapshot(), true);
  const second = beginLoading();
  context.mock.timers.tick(300);
  first();
  first();
  context.mock.timers.tick(300);
  assert.equal(loadingSnapshot(), true);
  second();
  context.mock.timers.tick(1);
  assert.equal(loadingSnapshot(), false);
  const brief = beginLoading();
  context.mock.timers.tick(301);
  brief();
  context.mock.timers.tick(398);
  assert.equal(loadingSnapshot(), true);
  context.mock.timers.tick(2);
  assert.equal(loadingSnapshot(), false);
  await assert.rejects(
    withLoading(async () => {
      throw Error("failed");
    }),
    /failed/,
  );
  context.mock.timers.tick(1000);
  assert.equal(loadingSnapshot(), false);
});
