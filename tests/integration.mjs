import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
if (!process.env.TEST_ADMIN_PASSWORD)
  throw Error("TEST_ADMIN_PASSWORD required");
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
let cookie = "";
let customerId;
let projectId;
let secondProjectId;
let leadId;
const marker = "QA-" + Date.now();
async function request(path, body, expected = 200, options = {}) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (r.status !== expected && body?.action === "billing") {
    const diagnostic = await db.rpc("nc_generate_billing");
    console.error("Billing diagnostic:", diagnostic.error);
  }
  assert.equal(r.status, expected, `${path}: ${await r.clone().text()}`);
  return r;
}
async function action(action, payload, expected = 200) {
  return (await request("/api/crm", { action, payload }, expected)).json();
}
try {
  await request("/api/crm", null, 401);
  await request("/api/crm", { action: "billing", payload: {} }, 403, {
    headers: { Origin: "https://invalid.example" },
  });
  const login = await request("/api/auth", {
    username: "Global_Admin",
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.ok(cookie.startsWith("nc_session="));
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(login.headers.get("set-cookie"), /SameSite=lax/i);
  const state = await (await request("/api/crm")).json();
  assert.equal(state.user.username, "Global_Admin");
  assert.equal(JSON.stringify(state).includes("password_hash"), false);
  console.log(
    "PASS: Login, geschützte Sitzung, unberechtigter Zugriff und Cross-Origin-Schutz",
  );
  let s = await action("customer", {
    name: marker,
    contact: "Synthetischer Test",
    email: "qa@example.invalid",
    address: "Testanschrift",
    notes: "Automatischer Test; wird entfernt.",
  });
  customerId = s.customers.find((c) => c.name === marker).id;
  s = await action("project", {
    customer_id: customerId,
    name: marker + " Projekt",
    package: "Business",
    budget_cents: 1490000,
    waiting_billable: false,
    notes: "Test",
  });
  projectId = s.projects.find((p) => p.name === marker + " Projekt").id;
  s = await action("project", {
    customer_id: customerId,
    name: marker + " Zweites Projekt",
    package: "Launch",
    budget_cents: 490000,
    waiting_billable: false,
    notes: "Test",
  });
  secondProjectId = s.projects.find(
    (p) => p.name === marker + " Zweites Projekt",
  ).id;
  await action(
    "project",
    {
      customer_id: customerId,
      name: "Invalid",
      package: "Launch",
      budget_cents: -1,
      waiting_billable: false,
      notes: "",
    },
    400,
  );
  const timer = {
    project_id: projectId,
    kind: "internal",
    action: "start",
    category: "active",
    description: "Synthetischer Test",
  };
  await Promise.all([action("timer", timer), action("timer", timer)]);
  s = await (await request("/api/crm")).json();
  assert.equal(
    s.time_entries.filter(
      (t) =>
        t.project_id === projectId && !t.stopped_at && t.kind === "internal",
    ).length,
    1,
  );
  await action(
    "timer",
    { ...timer, project_id: secondProjectId, kind: "external" },
    400,
  );
  await action("timer", { ...timer, kind: "external" });
  s = await action("timer", { ...timer, action: "stop" });
  assert.equal(
    s.time_entries.filter(
      (t) =>
        t.project_id === projectId && !t.stopped_at && t.kind === "external",
    ).length,
    1,
  );
  assert.equal(
    s.time_entries.filter(
      (t) =>
        t.project_id === projectId && !t.stopped_at && t.kind === "internal",
    ).length,
    0,
  );
  s = await action("timer", { ...timer, kind: "external", action: "stop" });
  const active = s.time_entries.find(
    (t) => t.project_id === projectId && t.kind === "external",
  );
  await action("approve", { id: active.id });
  await action("timer", { ...timer, kind: "external", category: "waiting" });
  s = await action("timer", {
    ...timer,
    kind: "external",
    action: "stop",
    category: "waiting",
  });
  const waiting = s.time_entries.find(
    (t) => t.project_id === projectId && t.category === "waiting",
  );
  await action("approve", { id: waiting.id }, 400);
  console.log(
    "PASS: Persistente unabhängige Timer, Konkurrenzschutz, Projektwechsel, Freigabe-Regeln",
  );
  const month = new Date().toISOString().slice(0, 7);
  await action("subscription", {
    project_id: projectId,
    plan: "Care Plus",
    starts_on: month + "-01",
  });
  await action(
    "subscription",
    { project_id: projectId, plan: "Care Plus", starts_on: month + "-01" },
    400,
  );
  s = await action("billing", {});
  assert.equal(s.invoices.filter((i) => i.project_id === projectId).length, 1);
  s = await action("billing", {});
  assert.equal(s.invoices.filter((i) => i.project_id === projectId).length, 1);
  assert.equal(
    s.invoices.find((i) => i.project_id === projectId).net_cents,
    74900,
  );
  const invoice = s.invoices.find((i) => i.project_id === projectId);
  await request("/crm/rechnung/" + invoice.id);
  console.log(
    "PASS: Betreuungsvertrag, doppelte Abrechnung verhindert, Rechnungsentwurf abrufbar",
  );
  s = await action("task", {
    project_id: projectId,
    title: marker + " Aufgabe",
  });
  const task = s.tasks.find((t) => t.project_id === projectId);
  s = await action("task_done", { id: task.id, done: true });
  assert.equal(s.tasks.find((t) => t.id === task.id).done, true);
  await request("/api/contact", {
    name: marker,
    company: "Synthetisches Unternehmen",
    email: "qa@example.invalid",
    package: "Launch",
    message: "Dies ist eine synthetische Testanfrage.",
    website: "",
  });
  s = await (await request("/api/crm")).json();
  leadId = s.leads.find((l) => l.name === marker).id;
  const out = await fetch(base + "/api/auth", {
    method: "DELETE",
    headers: { Origin: base, Cookie: cookie },
  });
  assert.equal(out.status, 200);
  await request("/api/crm", null, 401);
  console.log(
    "PASS: Aufgaben, Anfrageformular → CRM, Abmeldung invalidiert Sitzung",
  );
} finally {
  const ids = [projectId, secondProjectId].filter(Boolean);
  if (ids.length) {
    for (const table of [
      "nc_tasks",
      "nc_invoices",
      "nc_subscriptions",
      "nc_time_entries",
    ]) {
      const { error } = await db.from(table).delete().in("project_id", ids);
      if (error) throw error;
    }
    const { error } = await db.from("nc_projects").delete().in("id", ids);
    if (error) throw error;
  }
  if (customerId) await db.from("nc_customers").delete().eq("id", customerId);
  if (leadId) await db.from("nc_leads").delete().eq("id", leadId);
  console.log("Synthetische Testkunden und Projekte entfernt.");
}
