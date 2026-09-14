import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reportWindow,
  reportSeconds,
  berlinMidnight,
} from "../src/lib/time-report.ts";
test("Berlin month boundaries account for summer time", () => {
  const [start, end] = reportWindow("2026-03", Date.parse("2026-05-01"));
  assert.equal(new Date(start).toISOString(), "2026-02-28T23:00:00.000Z");
  assert.equal(new Date(end).toISOString(), "2026-03-31T22:00:00.000Z");
  assert.equal((end - start) / 3600000, 743);
});
test("Cross-month work is apportioned without duplicating duration", () => {
  const t = {
    started_at: "2026-08-31T21:30:00Z",
    stopped_at: "2026-08-31T22:30:00Z",
  };
  assert.equal(
    reportSeconds(t, reportWindow("2026-08", Date.parse("2026-10-01"))),
    1800,
  );
  assert.equal(
    reportSeconds(t, reportWindow("2026-09", Date.parse("2026-10-01"))),
    1800,
  );
});
test("Running timers stop at captured time and future months remain empty", () => {
  const now = Date.parse("2026-09-14T10:00:00Z");
  const t = { started_at: "2026-09-14T09:00:00Z", stopped_at: null };
  assert.equal(reportSeconds(t, reportWindow("", now)), 3600);
  assert.equal(reportSeconds(t, reportWindow("2026-10", now)), 0);
  assert.equal(
    new Date(berlinMidnight("2026-11-01")).toISOString(),
    "2026-10-31T23:00:00.000Z",
  );
  assert.throws(() => reportWindow("2026-13", now));
});
