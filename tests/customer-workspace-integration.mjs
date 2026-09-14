import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3114";
const session = JSON.parse(
  fs.readFileSync(process.env.TEST_SESSION_FILE, "utf8"),
);
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const marker = "QA-NEX-" + Date.now();
let customerId, projectId;
async function call(action, payload, status = 200) {
  const r = await fetch(base + "/api/crm", {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: "nc_session=" + session.token,
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await r.json();
  assert.equal(r.status, status, JSON.stringify(data.error));
  return data;
}
try {
  assert.equal((await fetch(base + "/api/time-report")).status, 401);
  let data = await call("customer", {
    name: marker,
    contact: "Test",
    email: "",
    address: "",
    notes: "",
  });
  customerId = data.customers.find((c) => c.name === marker).id;
  data = await call("customer_update", {
    id: customerId,
    name: marker,
    contact: "Test Kontakt",
    email: "test@example.invalid",
    address: "Teststraße 1\n12345 Teststadt",
    notes: "QA",
    phone: "012345",
    billing_name: "Test Rechnung",
    billing_email: "billing@example.invalid",
    billing_address: "Rechnungsstraße 2",
    vat_id: "DE-TEST",
    payment_terms_days: 30,
    source: "QA-Webseite",
  });
  assert.equal(
    data.customers.find((c) => c.id === customerId).billing_address,
    "Rechnungsstraße 2",
  );
  data = await call("project", {
    customer_id: customerId,
    name: marker + " Projekt",
    package: "Launch",
    budget_cents: 0,
    waiting_billable: false,
    notes: "QA",
  });
  projectId = data.projects.find((p) => p.name === marker + " Projekt").id;
  const start = new Date(Date.now() - 100 * 86400000);
  start.setUTCHours(1, 0, 0, 0);
  const stop = new Date(start.getTime() + 3600000);
  const payload = {
    project_id: projectId,
    kind: "internal",
    category: "active",
    description: "Vergangene Konzeptarbeit",
    started_at: start.toISOString(),
    stopped_at: stop.toISOString(),
  };
  data = await call("time_manual", payload);
  assert.ok(
    data.time_entries.some(
      (t) =>
        t.project_id === projectId &&
        Date.parse(t.started_at) === start.getTime(),
    ),
  );
  await call("time_manual", payload, 400);
  await call(
    "time_manual",
    {
      ...payload,
      started_at: stop.toISOString(),
      stopped_at: start.toISOString(),
    },
    400,
  );
  await call(
    "time_manual",
    {
      ...payload,
      started_at: new Date(Date.now() + 3600000).toISOString(),
      stopped_at: new Date(Date.now() + 7200000).toISOString(),
    },
    400,
  );
  data = await call("time_manual", { ...payload, kind: "external" });
  const t = data.time_entries.find(
    (t) => t.project_id === projectId && t.kind === "external",
  );
  assert.equal(t.approved_at, null);
  await call("approve", { id: t.id });
  const pdf = await fetch(base + "/api/time-report?customer=" + customerId, {
    headers: { Cookie: "nc_session=" + session.token },
  });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /application\/pdf/);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  fs.writeFileSync("/private/tmp/nex-report-qa.pdf", bytes);
  const bad = await fetch(base + "/api/time-report?month=2026-13", {
    headers: { Cookie: "nc_session=" + session.token },
  });
  assert.equal(bad.status, 400);
  console.log(
    "PASS: customer editing, persisted billing fields, manual time, overlap/future/reversed rejection, approval, authenticated PDF",
  );
} finally {
  if (projectId) {
    await db.from("nc_time_entries").delete().eq("project_id", projectId);
    await db.from("nc_projects").delete().eq("id", projectId);
  }
  if (customerId) await db.from("nc_customers").delete().eq("id", customerId);
}
