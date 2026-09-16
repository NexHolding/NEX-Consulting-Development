import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateOffer, offerQuantity } from "../src/lib/offer-catalog.ts";
import { offerCatalogSchema } from "../src/lib/offer-schema.ts";
import { extraAmount } from "../src/lib/time-report.ts";
import {
  assignmentStatus,
  validTimeAssignment,
} from "../src/lib/correction-rounds.ts";
const catalog = JSON.parse(
  readFileSync(
    new URL("../src/lib/default-offer-catalog.json", import.meta.url),
  ),
);
const config = {
  budget: 1000,
  logo: false,
  domains: 0,
  domainFee: 3,
  catalogVersion: 1,
};
test("catalog produces exact endpoints, tiers, add-ons and immutable selection", () => {
  assert.equal(offerCatalogSchema.safeParse(catalog).success, true);
  let q = calculateOffer(catalog, config);
  assert.equal(q.one_time_cents, 100000);
  assert.equal(q.monthly_cents, 4900);
  assert.equal(q.package, "Basic");
  q = calculateOffer(catalog, {
    ...config,
    budget: 100000,
    logo: true,
    domains: 2,
    domainFee: 5,
  });
  assert.equal(q.one_time_cents, 10029900);
  assert.equal(q.care_cents, 500000);
  assert.equal(q.monthly_cents, 501000);
  assert.equal(q.extra_hourly_cents, 15000);
  assert.equal(q.package, "Enterprise");
  assert.equal(
    calculateOffer(catalog, { ...config, budget: 10000 }).package,
    "Business",
  );
  const selection = { ...config };
  q = calculateOffer(catalog, selection);
  selection.budget = 5000;
  assert.equal(q.selection.budget, 1000);
  for (const budget of [999, 100001, 1200.5, NaN])
    assert.throws(() => calculateOffer(catalog, { ...config, budget }));
  assert.throws(() =>
    calculateOffer(catalog, { ...config, catalogVersion: 2 }),
  );
  assert.throws(() => calculateOffer(catalog, { ...config, domains: -1 }));
});
test("quantities and monthly care never shrink as budget grows; Basic never includes changes", () => {
  let previous = calculateOffer(catalog, config);
  for (let budget = 1001; budget <= 100000; budget += 137) {
    const q = calculateOffer(catalog, { ...config, budget });
    assert.ok(q.care_cents >= previous.care_cents);
    for (const item of q.items)
      assert.ok(item.quantity >= offerQuantity(previous, item.id));
    if (budget < 10000) assert.equal(offerQuantity(q, "changes"), 0);
    previous = q;
  }
  const edited = structuredClone(catalog);
  edited.services.find((s) => s.id === "changes").quantities =
    edited.points.map((p) => (p.budget < 10000 ? 0 : 8));
  assert.equal(
    offerQuantity(
      calculateOffer(edited, { ...config, budget: 9999 }),
      "changes",
    ),
    0,
  );
  const invalid = structuredClone(catalog);
  invalid.points[0].monthly = 0;
  assert.equal(offerCatalogSchema.safeParse(invalid).success, false);
  invalid.points[0].monthly = 49;
  invalid.services[0].quantities[1] = 0;
  assert.equal(offerCatalogSchema.safeParse(invalid).success, false);
});
test("scope quotas prevent double billing; extra cost uses exact time and frozen approved rate", () => {
  const project = {
    id: "p",
    name: "Project",
    included_correction_rounds: 2,
    included_change_rounds: 1,
    hourly_rate_cents: 15000,
    waiting_billable: false,
  };
  const entry = {
    id: "t",
    project_id: "p",
    kind: "external",
    category: "active",
    description: "Extra work",
    started_at: "2026-09-01T08:00:00Z",
    stopped_at: "2026-09-01T08:30:00Z",
    approved_at: null,
    correction_round: 2,
  };
  const window = [0, Date.parse("2026-09-02")];
  assert.equal(extraAmount(entry, project, window), 0);
  assert.equal(
    extraAmount({ ...entry, correction_round: 3 }, project, window),
    7500,
  );
  const change = {
    ...entry,
    correction_round: null,
    change_request: "Revised layout",
    change_round: 1,
  };
  assert.equal(assignmentStatus(change, project), "included");
  assert.equal(extraAmount(change, project, window), 0);
  assert.equal(
    extraAmount({ ...change, change_round: 2 }, project, window),
    7500,
  );
  assert.equal(
    assignmentStatus({ ...change, change_round: null }, project),
    "open",
  );
  assert.equal(
    extraAmount(
      { ...entry, correction_round: null, extra_work: "Additional page" },
      project,
      window,
    ),
    7500,
  );
  assert.equal(
    extraAmount(
      { ...entry, correction_round: 3, kind: "internal" },
      project,
      window,
    ),
    0,
  );
  assert.equal(
    extraAmount(
      { ...entry, correction_round: 3, category: "waiting" },
      project,
      window,
    ),
    0,
  );
  assert.equal(
    extraAmount(
      { ...entry, correction_round: 3, stopped_at: null },
      project,
      window,
    ),
    0,
  );
  assert.equal(
    extraAmount(
      { ...entry, approved_at: "2026-09-01", approved_rate_cents: 12000 },
      { ...project, hourly_rate_cents: 18000 },
      window,
    ),
    6000,
  );
  assert.equal(
    validTimeAssignment({ ...change, extra_work: "Additional page" }),
    false,
  );
  assert.equal(
    validTimeAssignment({
      correction_round: null,
      change_request: null,
      change_round: 1,
    }),
    false,
  );
});
