import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../src/lib/security.mjs";
import { chromium } from "@playwright/test";
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const marker = "PortalQA-" + Date.now();
const password = "Portal-QA-Only-2026!";
const ids = { customers: [], users: [] };
let ca, cb, adminCookie;
async function insert(table, p) {
  const r = await db.from(table).insert(p).select().single();
  assert.ifError(r.error);
  return r.data;
}
async function req(cookie, path, body, status = 200) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(r.status, status, await r.clone().text());
  return r;
}
async function login(username) {
  const r = await req(null, "/api/auth", { username, password });
  return r.headers.get("set-cookie").split(";")[0];
}
async function act(action, payload, status = 200, id) {
  return (
    await req(adminCookie, "/api/portal-admin", { action, payload, id }, status)
  ).json();
}

try {
  const a = await insert("nc_customers", {
    name: marker + " A",
    notes: "INTERNAL_CUSTOMER_SECRET",
    email: "qa@example.invalid",
  });
  ids.customers.push(a.id);
  const b = await insert("nc_customers", { name: marker + " B" });
  ids.customers.push(b.id);
  for (const [name, role, cid] of [
    ["admin", "global_admin", null],
    ["a", "customer", a.id],
    ["b", "customer", b.id],
  ]) {
    const u = await insert("nc_users", {
      username: marker + "-" + name,
      password_hash: hashPassword(password),
      role,
      customer_id: cid,
    });
    ids.users.push(u.id);
  }
  adminCookie = await login(marker + "-admin");
  ca = await login(marker + "-a");
  cb = await login(marker + "-b");
  await req(null, "/api/portal", null, 401);
  await req(ca, "/api/crm", null, 401);
  await req(ca, "/api/portal-admin", null, 401);
  await req(ca, "/api/portal-admin", { action: "account", payload: {} }, 401);
  const employee = await insert("nc_users", {
    username: marker + "-staff",
    password_hash: hashPassword(password),
    role: "employee",
  });
  ids.users.push(employee.id);
  const staffCookie = await login(marker + "-staff");
  await req(staffCookie, "/api/portal-admin");
  await req(staffCookie, "/api/crm", null, 401);
  await req(
    staffCookie,
    "/api/portal-admin",
    {
      action: "employee_account",
      payload: { username: "forbidden", password: "A-long-test-password" },
    },
    401,
  );
  const pa = await insert("nc_projects", {
    customer_id: a.id,
    name: marker + " internal project",
    notes: "INTERNAL_PROJECT_SECRET",
    budget_cents: 999999,
  });
  const pb = await insert("nc_projects", {
    customer_id: b.id,
    name: marker + " other project",
  });
  const w = await insert("nc_websites", {
    customer_id: a.id,
    name: "Aurelia Kundenwebsite",
    domain: "aurelia.example",
    features: "Kalender, Terminbuchung",
    project_id: pa.id,
    internal_notes: "INTERNAL_WEBSITE_SECRET",
  });
  const wb = await insert("nc_websites", {
    customer_id: b.id,
    name: "FOREIGN_SITE",
    domain: "foreign.example",
  });
  const orderPayload = {
    customer_id: a.id,
    number: marker + "-01",
    name: "Neue Website mit Buchungssystem",
    status: "Design in Bearbeitung",
    progress: 45,
    current_step: "Gestaltung der Startseite",
    completed_steps: "Kickoff abgeschlossen\nStruktur abgestimmt",
    next_step: "Design gemeinsam prüfen",
    questions: "Bitte Bildmaterial ergänzen.",
    due_date: "2026-10-15",
    due_kind: "Voraussichtlich",
    contact: "NEX Projektteam",
    customer_visible: true,
    internal_notes: "INTERNAL_ORDER_SECRET",
  };
  let state = await act("order", orderPayload);
  const o = state.orders.find((o) => o.number === orderPayload.number);
  await insert("nc_orders", {
    customer_id: a.id,
    name: "HIDDEN_ORDER",
    number: marker + "-hidden",
  });
  await act("order", {
    ...orderPayload,
    number: marker + "-02",
    name: "CRM-Erweiterung",
    status: "Planung und Konzeption",
  });
  await act("order_websites", {
    order_id: o.id,
    customer_id: a.id,
    website_ids: [w.id],
  });
  await act(
    "order_websites",
    { order_id: o.id, customer_id: a.id, website_ids: [wb.id] },
    400,
  );
  assert.equal(
    (await db.from("nc_order_websites").select("*").eq("order_id", o.id))
      .data[0].website_id,
    w.id,
  );
  await act("order", { ...orderPayload, progress: 101 }, 400, o.id);
  await act("document", {
    customer_id: a.id,
    title: "Projektvertrag",
    kind: "Vertrag",
    body: "Freigegebener Vertragsinhalt",
    customer_visible: true,
  });
  const pdfForm = new FormData();
  pdfForm.set("customer_id", a.id);
  pdfForm.set("title", "PDF-Vertrag");
  pdfForm.set("kind", "Vertrag");
  pdfForm.set(
    "file",
    new File(["%PDF-1.4\n%%EOF"], "test.pdf", { type: "application/pdf" }),
  );
  const upload = await fetch(base + "/api/portal-documents", {
    method: "POST",
    headers: { Cookie: adminCookie, Origin: base },
    body: pdfForm,
  });
  assert.equal(upload.status, 200, await upload.text());
  const doc = (
    await db
      .from("nc_documents")
      .select("*")
      .eq("customer_id", a.id)
      .eq("title", "PDF-Vertrag")
      .single()
  ).data;
  await req(ca, "/api/portal-documents?id=" + doc.id, null, 404);
  await act(
    "document",
    {
      customer_id: a.id,
      title: "PDF-Vertrag",
      kind: "Vertrag",
      body: "",
      customer_visible: true,
    },
    200,
    doc.id,
  );
  await req(ca, "/api/portal-documents?id=" + doc.id);
  await req(cb, "/api/portal-documents?id=" + doc.id, null, 404);
  await req(null, "/api/portal-documents?id=" + doc.id, null, 401);
  const invoice = await insert("nc_invoices", {
    customer_id: a.id,
    project_id: pa.id,
    subject: "DRAFT_SECRET",
    net_cents: 100,
  });
  await act(
    "visibility",
    { id: invoice.id, entity: "invoices", customer_visible: true },
    400,
  );
  await req(ca, "/api/portal", {
    action: "ticket",
    payload: {
      subject: "Kalenderproblem",
      description: "Die Terminbuchung auf aurelia.example funktioniert nicht.",
    },
  });
  state = await (await req(adminCookie, "/api/portal-admin")).json();
  const t = state.tickets.find((t) => t.customer_id === a.id);
  assert.equal(t.website_id, null);
  assert.equal(t.suggestion[0].website_id, w.id);
  const assignment = {
    id: t.id,
    customer_id: a.id,
    website_id: w.id,
    order_id: o.id,
    project_id: pa.id,
    subscription_id: null,
    assignee_id: ids.users[0],
    team: "Support",
    status: "In Bearbeitung",
    internal_notes: "INTERNAL_TICKET_SECRET",
  };
  await act("ticket", { ...assignment, website_id: wb.id }, 400);
  await act("ticket", { ...assignment, project_id: pb.id }, 400);
  await act("ticket", assignment);
  await act("message", {
    ticket_id: t.id,
    customer_id: a.id,
    body: "INTERNAL_MESSAGE_SECRET",
    customer_visible: false,
  });
  await act("message", {
    ticket_id: t.id,
    customer_id: a.id,
    body: "Wir prüfen Ihre Anfrage.",
    customer_visible: true,
  });
  await req(
    cb,
    "/api/portal",
    { action: "message", payload: { ticket_id: t.id, body: "Fremdzugriff" } },
    400,
  );
  await req(
    ca,
    "/api/portal",
    {
      action: "ticket",
      payload: { subject: "Hack", description: "Beispiel", customer_id: b.id },
    },
    400,
  );
  await req(
    ca,
    "/api/portal",
    { action: "order", payload: { id: o.id, progress: 100 } },
    400,
  );
  await req(
    ca,
    "/api/portal",
    {
      action: "contact",
      payload: {
        contact: "Testkunde",
        email: "qa@example.invalid",
        address: "Testadresse",
        notes: "overwrite",
      },
    },
    400,
  );
  const cross = await fetch(base + "/api/portal", {
    method: "POST",
    headers: {
      Cookie: ca,
      Origin: "https://evil.invalid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "ticket", payload: {} }),
  });
  assert.equal(cross.status, 403);
  const portal = await (await req(ca, "/api/portal")).json();
  const encoded = JSON.stringify(portal);
  for (const hidden of [
    "INTERNAL_",
    "FOREIGN_SITE",
    "HIDDEN_ORDER",
    "DRAFT_SECRET",
    "suggestion",
    "assignee_id",
    "project_id",
    "customer_id",
    "password_hash",
    "budget_cents",
    "time_entries",
  ])
    assert.equal(encoded.includes(hidden), false, hidden);
  assert.equal(portal.orders.length, 2);
  assert.equal(portal.websites.length, 0);
  assert.equal(portal.messages.length, 1);
  assert.equal(portal.documents.length, 2);
  assert.equal(portal.invoices.length, 0);
  const foreign = await (await req(cb, "/api/portal")).json();
  assert.equal(foreign.orders.length, 0);
  assert.equal(foreign.tickets.length, 0);
  const html = await (await req(ca, "/portal")).text();
  assert.equal(html.includes("INTERNAL_"), false);
  assert.equal(html.includes("Neue Website mit Buchungssystem"), true);
  await req(ca, "/api/portal", {
    action: "ticket",
    payload: {
      subject: "Unbekanntes Problem",
      description: "Bitte um Unterstützung.",
    },
  });
  const unknown = await db
    .from("nc_tickets")
    .select("*")
    .eq("customer_id", a.id)
    .eq("subject", "Unbekanntes Problem")
    .single();
  assert.equal(
    unknown.data.assignment_status,
    "Website-Zuordnung erforderlich",
  );
  await act("account_active", { id: ids.users[2], active: false });
  await req(cb, "/api/portal", null, 401);
  await act("account_active", { id: employee.id, active: false });
  await req(staffCookie, "/api/portal-admin", null, 401);
  console.log(
    "PASS: Rollen, Kundentrennung, Freigaben, RSC-Payload, Ticketannahme, Vorschläge, interne Kommentare, falsche Zuordnungen, atomare Websiteverknüpfung, CSRF und Zugangssperre.",
  );
  if (process.env.BROWSER_QA === "1") {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/login");
      await page
        .getByLabel("Benutzername", { exact: true })
        .fill(marker + "-a");
      await page.getByLabel("Passwort", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Workspace öffnen" }).click();
      await page.waitForURL("**/portal");
      await page
        .getByRole("heading", { name: "Willkommen in Ihrem Portal." })
        .waitFor();
      await page.screenshot({ path: "/private/tmp/nex-portal-desktop.png" });
      assert.equal(
        await page
          .getByRole("navigation", { name: "Kundenportal" })
          .getByRole("button")
          .count(),
        7,
      );
      await page
        .getByRole("button", { name: /Neue Website mit Buchungssystem/ })
        .click();
      await page
        .getByText("Gestaltung der Startseite", { exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Supporttickets", exact: true })
        .click();
      await page
        .getByLabel("Betreff", { exact: true })
        .fill("Browser-Testticket");
      await page
        .getByLabel("Ihr Anliegen", { exact: true })
        .fill("Die Website lädt langsam.");
      await page.getByRole("button", { name: "Ticket absenden" }).click();
      await page.getByRole("button", { name: /Browser-Testticket/ }).waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Dashboard", exact: true })
        .click();
      await page.screenshot({ path: "/private/tmp/nex-portal-mobile.png" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.getByRole("button", { name: "Abmelden", exact: true }).click();
      await page.waitForURL("**/login");
      await page
        .getByLabel("Benutzername", { exact: true })
        .fill(marker + "-admin");
      await page.getByLabel("Passwort", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Workspace öffnen" }).click();
      await page.waitForURL("**/crm");
      await page.goto(base + "/crm/portal");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: "/private/tmp/nex-admin-before.png" });
      await page.getByLabel("Kunde", { exact: true }).selectOption(a.id);
      await page.getByRole("button", { name: "Tickets", exact: true }).click();
      await page.getByRole("button", { name: /Kalenderproblem/ }).click();
      await page.getByLabel("Betroffene Website / Domain").waitFor();
      await page.screenshot({ path: "/private/tmp/nex-admin-tickets.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      console.log(
        "PASS: Browser-Login, sieben Kundenbereiche, Auftragsdetail, Ticketformular, Adminzuordnung, Desktop und Mobil ohne Überlauf oder Browserfehler.",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  {
    const docs = await db
      .from("nc_documents")
      .select("file_path")
      .in("customer_id", ids.customers);
    const paths = (docs.data || []).map((d) => d.file_path).filter(Boolean);
    if (paths.length) await db.storage.from("nc-documents").remove(paths);
    for (const table of [
      "nc_ticket_messages",
      "nc_tickets",
      "nc_order_websites",
      "nc_orders",
      "nc_websites",
      "nc_documents",
      "nc_invoices",
    ]) {
      const r = await db.from(table).delete().in("customer_id", ids.customers);
      if (r.error) console.error("Cleanup", table, r.error.code);
    }
    await db.from("nc_projects").delete().in("customer_id", ids.customers);
    await db.from("nc_audit").delete().in("user_id", ids.users);
    await db.from("nc_users").delete().in("id", ids.users);
    await db.from("nc_customers").delete().in("id", ids.customers);
  }
}
