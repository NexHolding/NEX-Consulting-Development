import { NextResponse } from "next/server";
import { z } from "zod";
import { admin, db, sameOrigin, snapshot } from "@/lib/server";
const uuid = z.string().uuid();
const text = z.string().trim().min(2).max(200);
const cents = z.number().int().min(0).max(1000000000);
export async function GET() {
  try {
    const user = await admin();
    return NextResponse.json(
      { user, ...(await snapshot()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === "UNAUTHORIZED"
            ? "Bitte anmelden."
            : "Daten konnten nicht geladen werden.",
      },
      {
        status: e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 500,
      },
    );
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Anfrage nicht erlaubt." },
      { status: 403 },
    );
  try {
    const user = await admin();
    const raw = await request.json();
    const { action, payload } = z
      .object({
        action: z.string(),
        payload: z.record(z.string(), z.unknown()),
      })
      .parse(raw);
    const client = db();
    let result;
    switch (action) {
      case "customer_update": {
        const p = z
          .object({
            id: uuid,
            name: text.max(160),
            contact: z.string().max(160),
            email: z.union([z.email(), z.literal("")]),
            address: z.string().max(1000),
            notes: z.string().max(4000),
            phone: z.string().max(80),
            billing_name: z.string().max(200),
            billing_email: z.union([z.email(), z.literal("")]),
            billing_address: z.string().max(1000),
            vat_id: z.string().max(80),
            payment_terms_days: z.number().int().min(0).max(365),
            source: z.string().max(160),
          })
          .parse(payload);
        const { id, ...fields } = p;
        result = await client
          .from("nc_customers")
          .update(fields)
          .eq("id", id)
          .select("id")
          .single();
        break;
      }
      case "time_manual": {
        const p = z
          .object({
            project_id: uuid,
            kind: z.enum(["internal", "external"]),
            category: z.enum(["active", "processing", "waiting", "break"]),
            description: z.string().trim().min(3).max(1000),
            started_at: z.iso.datetime(),
            stopped_at: z.iso.datetime(),
          })
          .parse(payload);
        result = await client.rpc("nc_manual_time", {
          p_user: user.id,
          p_project: p.project_id,
          p_kind: p.kind,
          p_category: p.category,
          p_description: p.description,
          p_start: p.started_at,
          p_stop: p.stopped_at,
        });
        break;
      }
      case "customer": {
        const p = z
          .object({
            name: text,
            contact: z.string().max(160),
            email: z.union([z.email(), z.literal("")]),
            address: z.string().max(1000),
            notes: z.string().max(4000),
          })
          .parse(payload);
        result = await client.from("nc_customers").insert(p);
        break;
      }
      case "project": {
        const p = z
          .object({
            customer_id: uuid,
            name: text,
            package: z.enum(["Launch", "Business", "Enterprise"]),
            budget_cents: cents,
            waiting_billable: z.boolean(),
            notes: z.string().max(4000),
          })
          .parse(payload);
        result = await client.from("nc_projects").insert(p);
        break;
      }
      case "status": {
        const p = z
          .object({
            id: uuid,
            status: z.enum([
              "Konzeption",
              "Design",
              "Entwicklung",
              "Kundenprüfung",
              "Live",
              "Betreuung",
              "Pausiert",
              "Archiviert",
            ]),
          })
          .parse(payload);
        result = await client
          .from("nc_projects")
          .update({ status: p.status })
          .eq("id", p.id);
        break;
      }
      case "task": {
        const p = z.object({ project_id: uuid, title: text }).parse(payload);
        result = await client.from("nc_tasks").insert(p);
        break;
      }
      case "task_done": {
        const p = z.object({ id: uuid, done: z.boolean() }).parse(payload);
        result = await client
          .from("nc_tasks")
          .update({ done: p.done })
          .eq("id", p.id);
        break;
      }
      case "timer": {
        const p = z
          .object({
            project_id: uuid,
            kind: z.enum(["internal", "external"]),
            action: z.enum(["start", "stop"]),
            category: z.enum(["active", "processing", "waiting", "break"]),
            description: z.string().trim().min(3).max(1000),
          })
          .parse(payload);
        result = await client.rpc("nc_timer", {
          p_user: user.id,
          p_project: p.project_id,
          p_kind: p.kind,
          p_action: p.action,
          p_category: p.category,
          p_description: p.description,
        });
        break;
      }
      case "approve": {
        const p = z.object({ id: uuid }).parse(payload);
        result = await client.rpc("nc_approve_time", {
          p_user: user.id,
          p_entry: p.id,
        });
        break;
      }
      case "subscription": {
        const p = z
          .object({
            project_id: uuid,
            plan: z.enum(["Care", "Care Plus", "Care Dedicated"]),
            starts_on: z.iso.date(),
          })
          .parse(payload);
        if (!p.starts_on.endsWith("-01"))
          throw new Error(
            "Betreuungsbeginn muss der erste Tag eines Monats sein.",
          );
        const plans = {
          Care: [24900, 60],
          "Care Plus": [74900, 240],
          "Care Dedicated": [199000, 720],
        };
        result = await client.from("nc_subscriptions").insert({
          ...p,
          monthly_cents: plans[p.plan][0],
          included_minutes: plans[p.plan][1],
        });
        break;
      }
      case "subscription_end": {
        const p = z.object({ id: uuid, ends_on: z.iso.date() }).parse(payload);
        result = await client
          .from("nc_subscriptions")
          .update({ ends_on: p.ends_on })
          .eq("id", p.id);
        break;
      }
      case "billing": {
        result = await client.rpc("nc_generate_billing");
        break;
      }
      case "invoice": {
        const p = z
          .object({ project_id: uuid, subject: text, net_cents: cents })
          .parse(payload);
        const { data: project } = await client
          .from("nc_projects")
          .select("customer_id")
          .eq("id", p.project_id)
          .single();
        if (!project) throw new Error("Projekt fehlt.");
        result = await client.from("nc_invoices").insert({
          ...p,
          customer_id: project.customer_id,
          items: [
            { description: p.subject, quantity: 1, unit_cents: p.net_cents },
          ],
        });
        break;
      }
      case "lead_status": {
        const p = z
          .object({
            id: uuid,
            status: z.enum([
              "Neu",
              "Qualifiziert",
              "Gespräch",
              "Angebot",
              "Gewonnen",
              "Verloren",
            ]),
          })
          .parse(payload);
        result = await client
          .from("nc_leads")
          .update({ status: p.status })
          .eq("id", p.id);
        break;
      }
      default:
        return NextResponse.json(
          { error: "Unbekannte Aktion." },
          { status: 400 },
        );
    }
    if (result?.error) {
      const code = result.error.code;
      const msg =
        code === "23505"
          ? "Dieser Eintrag besteht bereits."
          : code === "P0001"
            ? result.error.message
            : "Speichern fehlgeschlagen. Bitte Angaben prüfen.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    await client.from("nc_audit").insert({ user_id: user.id, action });
    return NextResponse.json({ ok: true, ...(await snapshot()) });
  } catch (e) {
    const unauthorized = e instanceof Error && e.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        error: unauthorized
          ? "Bitte anmelden."
          : e instanceof z.ZodError
            ? "Bitte alle Pflichtfelder korrekt ausfüllen."
            : e instanceof Error && e.message.startsWith("Betreuungsbeginn")
              ? e.message
              : "Die Aktion konnte nicht gespeichert werden.",
      },
      { status: unauthorized ? 401 : 400 },
    );
  }
}
