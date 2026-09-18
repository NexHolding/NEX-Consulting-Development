import { readOfferCatalog } from "@/lib/offer-server";
import { offerSelectionSchema } from "@/lib/offer-schema";
import { calculateOffer, offerQuantity } from "@/lib/offer-catalog";
import { NextResponse } from "next/server";
import { timeEditSchema } from "@/lib/time-edit-schema";
import { timeAssignmentSchema } from "@/lib/time-assignment-schema";
import { z } from "zod";
import { admin, db, sameOrigin, snapshot } from "@/lib/server";
import {
  customerCreateSchema,
  customerUpdateSchema,
} from "@/lib/customer-schema";
import { customerAddressPatch } from "@/lib/customer-fields";
const uuid = z.string().uuid();
const correctionRound = z
  .number()
  .int()
  .min(1)
  .max(999)
  .nullable()
  .default(null);
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
        const { id, ...fields } = customerUpdateSchema.parse(payload);
        const existing = await client
          .from("nc_customers")
          .select("*")
          .eq("id", id)
          .single();
        if (existing.error) throw existing.error;
        result = await client
          .from("nc_customers")
          .update(customerAddressPatch(fields, existing.data))
          .eq("id", id)
          .select("id")
          .single();
        break;
      }
      case "project_offer": {
        const p = z
          .object({ id: uuid, configuration: offerSelectionSchema })
          .parse(payload);
        const catalog = await readOfferCatalog();
        const quote = calculateOffer(catalog, p.configuration);
        result = await client.rpc("nc_set_project_offer", {
          p_user: user.id,
          p_project: p.id,
          p_quote: quote,
          p_corrections: offerQuantity(quote, "corrections"),
          p_changes: offerQuantity(quote, "changes"),
        });
        break;
      }
      case "project_limits": {
        const p = z
          .object({
            id: uuid,
            included_correction_rounds: z
              .number()
              .int()
              .min(0)
              .max(999)
              .nullable(),
            included_change_rounds: z.number().int().min(0).max(999).nullable(),
            hourly_rate_cents: z.number().int().min(0).max(1000000),
          })
          .parse(payload);
        result = await client.rpc("nc_set_project_limits", {
          p_user: user.id,
          p_project: p.id,
          p_corrections: p.included_correction_rounds,
          p_changes: p.included_change_rounds,
          p_rate: p.hourly_rate_cents,
        });
        break;
      }
      case "correction_settings": {
        const p = z
          .object({
            id: uuid,
            included_correction_rounds: z
              .number()
              .int()
              .min(0)
              .max(999)
              .nullable(),
          })
          .parse(payload);
        result = await client.rpc("nc_correction_settings", {
          p_user: user.id,
          p_project: p.id,
          p_included: p.included_correction_rounds,
        });
        break;
      }
      case "time_assignment": {
        const { id } = z.object({ id: uuid }).parse(payload);
        const assignment = timeAssignmentSchema.parse(payload);
        result = await client.rpc("nc_assign_time_work", {
          p_user: user.id,
          p_entry: id,
          p_round: assignment.correction_round,
          p_change_request: assignment.change_request,
          p_change_round: assignment.change_round,
          p_extra_work: assignment.extra_work,
        });
        break;
      }
      case "time_correction": {
        const p = z
          .object({ id: uuid, correction_round: correctionRound })
          .parse(payload);
        result = await client.rpc("nc_assign_correction", {
          p_user: user.id,
          p_entry: p.id,
          p_round: p.correction_round,
        });
        break;
      }
      case "time_edit": {
        const p = timeEditSchema.parse(payload);
        const assignment = timeAssignmentSchema.parse(payload);
        result = await client.rpc("nc_edit_time", {
          p_user: user.id,
          p_entry: p.id,
          p_version: p.version,
          p_project: p.project_id,
          p_kind: p.kind,
          p_category: p.category,
          p_description: p.description,
          p_start: p.started_at,
          p_stop: p.stopped_at,
          p_reason: p.reason,
          p_correction_round: assignment.correction_round,
          p_change_request: assignment.change_request,
          p_change_round: assignment.change_round,
          p_extra_work: assignment.extra_work,
        });
        break;
      }
      case "time_manual": {
        const assignment = timeAssignmentSchema.parse(payload);
        const p = z
          .object({
            project_id: uuid,
            kind: z.enum(["internal", "external"]),
            category: z.enum(["active", "processing", "waiting", "break"]),
            description: z.string().trim().min(3).max(1000),
            started_at: z.iso.datetime(),
            stopped_at: z.iso.datetime(),
            correction_round: correctionRound,
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
          p_correction_round: assignment.correction_round,
          p_change_request: assignment.change_request,
          p_change_round: assignment.change_round,
          p_extra_work: assignment.extra_work,
        });
        break;
      }
      case "customer": {
        const p = customerCreateSchema.parse(payload);
        result = await client
          .from("nc_customers")
          .insert(customerAddressPatch(p));
        break;
      }
      case "project": {
        const p = z
          .object({
            customer_id: uuid,
            name: text,
            package: z.enum(["Basic", "Launch", "Business", "Enterprise"]),
            budget_cents: cents,
            waiting_billable: z.boolean(),
            included_correction_rounds: z
              .number()
              .int()
              .min(0)
              .max(999)
              .nullable()
              .default(null),
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
        const assignment = timeAssignmentSchema.parse(payload);
        const p = z
          .object({
            project_id: uuid,
            kind: z.enum(["internal", "external"]),
            action: z.enum(["start", "stop"]),
            category: z.enum(["active", "processing", "waiting", "break"]),
            description: z.string().trim().min(3).max(1000),
            correction_round: correctionRound,
          })
          .parse(payload);
        result = await client.rpc("nc_timer", {
          p_user: user.id,
          p_project: p.project_id,
          p_kind: p.kind,
          p_action: p.action,
          p_category: p.category,
          p_description: p.description,
          p_correction_round: assignment.correction_round,
          p_change_request: assignment.change_request,
          p_change_round: assignment.change_round,
          p_extra_work: assignment.extra_work,
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

            starts_on: z.iso.date(),
          })
          .parse(payload);
        if (!p.starts_on.endsWith("-01"))
          throw new Error(
            "Betreuungsbeginn muss der erste Tag eines Monats sein.",
          );
        const r = await client
          .from("nc_projects")
          .select("offer_snapshot")
          .eq("id", p.project_id)
          .single();
        if (r.error || !r.data.offer_snapshot)
          throw Error(
            "Bitte zuerst den Projektumfang samt Betreuung vereinbaren.",
          );
        const quote = r.data.offer_snapshot;
        result = await client.from("nc_subscriptions").insert({
          project_id: p.project_id,
          starts_on: p.starts_on,
          plan:
            quote.package === "Basic"
              ? "Care"
              : quote.package === "Business"
                ? "Care Plus"
                : "Care Dedicated",
          monthly_cents: quote.monthly_cents,
          included_minutes: offerQuantity(quote, "care_minutes"),
          offer_snapshot: quote,
          included_requests: offerQuantity(quote, "care_requests"),
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
            ? "Bitte die eingegebenen Daten prüfen: Pflichtangaben, E-Mail-Adressen und Feldlängen."
            : e instanceof Error && e.message.startsWith("Betreuungsbeginn")
              ? e.message
              : "Die Aktion konnte nicht gespeichert werden.",
      },
      { status: unauthorized ? 401 : 400 },
    );
  }
}
