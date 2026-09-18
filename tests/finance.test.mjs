import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contribution,
  summarize,
  distributeCents,
  depreciationForMonth,
  journalLines,
  parseMoney,
  isIban,
  csvCell,
} from "../src/lib/finance/model.ts";
import {
  financeDataSchema,
  financeImportSchema,
  allocationSchema,
} from "../src/lib/finance/schema.ts";
const data = financeDataSchema.parse({
  title: "Synthetische Rechnung",
  date: "2026-09-01",
  document_kind: "incoming_invoice",
  net: 10000,
  tax: 1900,
  gross: 11900,
  debit: "6300",
  credit: "3300",
  tax_account: "1406",
});
const record = {
  id: "11111111-1111-4111-8111-111111111111",
  brand: "nex",
  source: "nex",
  external_id: "test",
  kind: "document",
  state: "posted",
  data,
  missing: false,
};
const brands = ["nex", "insolvenzhelden", "finanzhelden", "unassigned"].map(
  (code) => ({ code, name: code, active: true }),
);
test("finance counts only posted operating documents and depreciation, not bank/payroll/asset duplicate totals", () => {
  assert.deepEqual(contribution(record), { income: 0, cost: 10000 });
  for (const patch of [
    { state: "draft" },
    { state: "reversed" },
    { missing: true },
    { kind: "bank" },
    { kind: "asset" },
    { kind: "payroll" },
    { data: { ...data, recognition: "asset" } },
  ])
    assert.deepEqual(contribution({ ...record, ...patch }), {
      income: 0,
      cost: 0,
    });
  assert.equal(contribution({ ...record, kind: "depreciation" }).cost, 10000);
  assert.equal(
    contribution({ ...record, data: { ...data, net: -10000 } }).cost,
    -10000,
  );
});
test("double entry journal balances original, credit note, reversal and zero-tax depreciation", () => {
  for (const outgoing of [false, true])
    for (const sign of [1, -1]) {
      const r = {
        ...record,
        data: {
          ...data,
          document_kind: outgoing ? "outgoing_invoice" : "incoming_invoice",
          net: 10000 * sign,
          tax: 1900 * sign,
          gross: 11900 * sign,
        },
      };
      const lines = journalLines(r);
      assert.equal(lines.length, 3);
      assert.equal(
        lines.reduce((n, l) => n + l.amount, 0),
        0,
      );
      assert.equal(lines[0].amount, (outgoing ? 11900 : 10000) * sign);
    }
  const lines = journalLines({
    ...record,
    kind: "depreciation",
    data: { ...data, document_kind: "other", tax: 0, gross: 10000 },
  });
  assert.equal(lines.length, 2);
  assert.equal(
    lines.reduce((n, l) => n + l.amount, 0),
    0,
  );
});
test("allocation preserves every cent and the company result across brand views", () => {
  for (const total of [1, 2, 10001, -10001, 99999999999]) {
    const result = distributeCents(total, { a: 3333, b: 3333, c: 3334 });
    assert.equal(
      Object.values(result).reduce((n, x) => n + x, 0),
      total,
    );
  }
  const records = [
    record,
    {
      ...record,
      brand: "insolvenzhelden",
      data: { ...data, document_kind: "outgoing_invoice", net: 20000 },
    },
    {
      ...record,
      brand: "finanzhelden",
      data: { ...data, document_kind: "outgoing_invoice", net: 10000 },
    },
  ];
  const none = summarize(
    records,
    brands,
    { mode: "none", weights: {} },
    "2026-09",
  );
  const allocated = summarize(
    records,
    brands,
    { mode: "revenue", weights: {} },
    "2026-09",
  );
  assert.equal(none.cost, 10000);
  assert.equal(allocated.cost, none.cost);
  assert.equal(
    allocated.rows.reduce((n, r) => n + r.result, 0),
    20000,
  );
  assert.equal(
    allocated.rows.reduce((n, r) => n + r.allocated, 0),
    0,
  );
  assert.equal(allocated.unallocated, 0);
  assert.equal(
    allocated.rows.find((r) => r.code === "insolvenzhelden").allocated,
    6667,
  );
  assert.equal(
    summarize(records, brands, { mode: "none", weights: {} }, "2026-08").cost,
    0,
  );
});
test("depreciation across calendar years exhausts exact basis including residual value", () => {
  const asset = {
    ...record,
    kind: "asset",
    data: {
      ...data,
      in_service: "2025-11-20",
      acquisition_cost: 10001,
      residual_value: 1000,
      life_months: 36,
    },
  };
  let total = 0;
  for (let i = 0; i < 36; i++) {
    const d = new Date(Date.UTC(2025, 10 + i, 1));
    total += depreciationForMonth(asset, d.toISOString().slice(0, 7));
  }
  assert.equal(total, 9001);
  assert.equal(depreciationForMonth(asset, "2025-10"), 0);
  assert.equal(depreciationForMonth(asset, "2028-11"), 0);
});
test("German money, IBAN, CSV injection and strict integration validation", () => {
  assert.equal(parseMoney("1.234,56 €"), 123456);
  assert.equal(parseMoney("-10,01"), -1001);
  assert.throws(() => parseMoney("2,001"));
  assert.equal(isIban("DE89 3704 0044 0532 0130 00"), true);
  assert.equal(isIban("DE00370400440532013000"), false);
  assert.equal(csvCell("=cmd()"), '"\'=cmd()"');
  assert.equal(csvCell(-123.45), '"-123.45"');
  assert.equal(
    financeDataSchema.safeParse({ ...data, date: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    financeDataSchema.safeParse({ ...data, currency: "USD" }).success,
    false,
  );
  assert.equal(
    allocationSchema.safeParse({
      mode: "fixed",
      weights: {
        insolvenzhelden: 2500,
        finanzhelden: 2500,
        goldhelden: 2500,
        posthelden: 2500,
      },
    }).success,
    true,
  );
  assert.equal(
    allocationSchema.safeParse({
      mode: "fixed",
      weights: {
        insolvenzhelden: 10000,
        finanzhelden: 1,
        goldhelden: 0,
        posthelden: 0,
      },
    }).success,
    false,
  );
  assert.equal(
    financeImportSchema.safeParse({
      schema_version: 1,
      source: "insolvenzhelden",
      batch_id: "testbatch",
      mode: "snapshot",
      generated_at: new Date().toISOString(),
      records: [],
    }).success,
    true,
  );
});
