import { test } from "node:test";
import assert from "node:assert/strict";
import { berlinDateTime, berlinInputToIso } from "../src/lib/time-edit.ts";
import { timeEditSchema } from "../src/lib/time-edit-schema.ts";
test("time correction uses Berlin time, preserves untouched precision and handles DST", () => {
  assert.equal(berlinDateTime("2026-09-17T16:45:00Z"), "2026-09-17T18:45:00");
  assert.equal(
    berlinInputToIso("2026-09-17T18:45"),
    "2026-09-17T16:45:00.000Z",
  );
  assert.equal(
    berlinInputToIso("2026-01-17T18:45"),
    "2026-01-17T17:45:00.000Z",
  );
  assert.equal(
    berlinInputToIso("2026-09-17T12:21:22", "2026-09-17T10:21:22.384671Z"),
    "2026-09-17T10:21:22.384671Z",
  );
  assert.throws(() => berlinInputToIso("2026-03-29T02:30"), /existiert nicht/);
  assert.throws(() => berlinInputToIso("2026-10-25T02:30"), /doppeldeutig/);
  assert.equal(
    berlinInputToIso("2026-10-25T02:30", "2026-10-25T01:30:00Z"),
    "2026-10-25T01:30:00Z",
  );
  assert.throws(() => berlinInputToIso("2026-02-30T12:00"));
});
test("time edit validation rejects missing reasons, future, reversed and oversized periods", () => {
  const payload = {
    id: "11111111-1111-4111-8111-111111111111",
    version: 0,
    project_id: "22222222-2222-4222-8222-222222222222",
    kind: "external",
    category: "active",
    description: "Anbindung Google Meet",
    started_at: "2026-09-17T10:21:22Z",
    stopped_at: "2026-09-17T16:45:00Z",
    reason: "Timer nicht gestoppt",
  };
  assert.equal(timeEditSchema.safeParse(payload).success, true);
  for (const patch of [
    { reason: "" },
    { version: -1 },
    { kind: "invalid" },
    { stopped_at: payload.started_at },
    { stopped_at: "2026-09-19T16:45:00Z" },
    { stopped_at: new Date(Date.now() + 3600000).toISOString() },
  ])
    assert.equal(
      timeEditSchema.safeParse({ ...payload, ...patch }).success,
      false,
    );
});
