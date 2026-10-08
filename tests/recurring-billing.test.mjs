import { test } from "node:test";
import assert from "node:assert/strict";
import {
  billingProductSchema,
  recurringCostSchema,
  subscriptionSchema,
  monthlyCharge,
  billingStatus,
} from "../src/lib/recurring-billing.ts";
const uuid = "11111111-1111-4111-8111-111111111111";
const cost = {
  customer_id: uuid,
  product_id: uuid,
  label: "Domain example.com",
  cost_cents: 1000,
  factor: 1.3,
  starts_on: "2026-10-08",
};
test("net resale amounts round exact decimal factors to cents", () => {
  assert.equal(monthlyCharge(1000, 1.3), 1300);
  assert.equal(monthlyCharge(50, 1.13), 57);
  assert.equal(monthlyCharge(1, 1.3), 1);
  assert.equal(monthlyCharge(1000000000, 100), 100000000000);
});
test("products default to user requested factor; invalid markup and cents fail", () => {
  assert.equal(billingProductSchema.parse({ name: "Domain" }).factor, 1.3);
  for (const factor of [0, 0.9, 101, 1.12345, NaN])
    assert.equal(
      recurringCostSchema.safeParse({ ...cost, factor }).success,
      false,
    );
  for (const cost_cents of [-1, 0, 1.5, 1000000001])
    assert.equal(
      recurringCostSchema.safeParse({ ...cost, cost_cents }).success,
      false,
    );
});
test("customer costs support optional project, open ends and mid-month start", () => {
  const result = recurringCostSchema.parse(cost);
  assert.equal(result.project_id, null);
  assert.equal(result.ends_on, null);
  assert.equal(
    recurringCostSchema.safeParse({ ...cost, ends_on: "2026-10-07" }).success,
    false,
  );
  assert.equal(
    recurringCostSchema.safeParse({ ...cost, ends_on: "2026-10-08" }).success,
    true,
  );
  assert.equal(
    recurringCostSchema.safeParse({ ...cost, starts_on: "2026-02-30" }).success,
    false,
  );
});
test("custom software subscription is independent of project quote; package selection is explicit", () => {
  const sub = {
    project_id: uuid,
    starts_on: "2026-10-08",
    mode: "individual",
    plan: "Individuelle Betreuung",
    monthly_cents: 19900,
  };
  assert.equal(subscriptionSchema.parse(sub).monthly_cents, 19900);
  assert.equal(
    subscriptionSchema.safeParse({ ...sub, monthly_cents: undefined }).success,
    false,
  );
  assert.equal(
    subscriptionSchema.safeParse({ ...sub, ends_on: "2026-10-01" }).success,
    false,
  );
  assert.equal(
    subscriptionSchema.safeParse({
      ...sub,
      mode: "package",
      package: "Business",
    }).success,
    true,
  );
  assert.equal(
    subscriptionSchema.safeParse({ ...sub, mode: "package" }).success,
    false,
  );
  assert.equal(
    subscriptionSchema.parse({ project_id: uuid, starts_on: "2026-10-01" })
      .mode,
    "project",
  );
});
test("status and monthly totals exclude planned, expired and paused contracts", () => {
  const row = { starts_on: "2026-10-08", ends_on: "2026-10-31", active: true };
  assert.equal(billingStatus(row, "2026-10-07"), "Geplant");
  assert.equal(billingStatus(row, "2026-10-08"), "Laufend");
  assert.equal(billingStatus(row, "2026-10-31"), "Laufend");
  assert.equal(billingStatus(row, "2026-11-01"), "Beendet");
  assert.equal(
    billingStatus({ ...row, active: false }, "2026-10-08"),
    "Pausiert",
  );
});
