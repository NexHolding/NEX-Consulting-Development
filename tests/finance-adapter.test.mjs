import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapAccounting,
  authorized,
} from "../docs/integrations/insolvenzhelden/mapper.mjs";
import { financeImportSchema } from "../src/lib/finance/schema.ts";
const input = {
  documents: [],
  assets: [],
  depreciation: [],
  payroll: [],
  bank: [],
};
test("source authentication fails closed and requires dedicated 256-bit key", () => {
  const token = "ab".repeat(32),
    req = new Request("https://example.test", {
      headers: { authorization: "Bearer " + token },
    });
  assert.equal(authorized(req, token), true);
  assert.equal(authorized(req, undefined), false);
  assert.equal(authorized(req, "cd".repeat(32)), false);
  assert.equal(authorized(new Request("https://example.test"), token), false);
});
test("source adapter limits data to financial fields and stable revisions, excludes payroll previews", () => {
  const d = {
    id: "synthetic-document",
    currency: "EUR",
    booking_status: "posted",
    document_kind: "incoming_invoice",
    document_date: "2026-09-01",
    booking_text: "Synthetische Rechnung",
    net_cents: 10000,
    tax_cents: 1900,
    gross_cents: 11900,
    debit_account_skr04: "6300",
    credit_account_skr04: "3300",
    tax_account_skr04: "1406",
  };
  const source = {
    ...input,
    documents: [d],
    payroll: [{ id: "preview", is_current: true, run_type: "preview" }],
  };
  const a = mapAccounting(source),
    b = mapAccounting(source);
  assert.equal(a.records.length, 1);
  assert.equal(a.records[0].revision, b.records[0].revision);
  assert.notEqual(a.batch_id, b.batch_id);
  assert.equal(financeImportSchema.safeParse(a).success, true);
  const changed = mapAccounting({
    ...source,
    documents: [{ ...d, gross_cents: 12000 }],
  });
  assert.notEqual(a.records[0].revision, changed.records[0].revision);
  assert.throws(() =>
    mapAccounting({ ...input, documents: [{ ...d, currency: "USD" }] }),
  );
  assert.throws(() =>
    mapAccounting({
      ...input,
      documents: Array.from({ length: 501 }, () => d),
    }),
  );
});
