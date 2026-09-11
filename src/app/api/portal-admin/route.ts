import { NextResponse } from "next/server";
import { z } from "zod";
import { admin, db, sameOrigin } from "@/lib/server";
import { portalAdminSnapshot, portalStaff } from "@/lib/portal-server";
import { orderStatuses } from "@/lib/portal-model";
import { hashPassword } from "@/lib/security.mjs";
import { ticketSuggestions } from "@/lib/ticket-suggestions";
const id = z.string().uuid();
const optionalId = id.nullable();
const short = z.string().trim().max(200);
const long = z.string().max(6000);
const visible = z.boolean();
const order = z.object({
  customer_id: id,
  number: short.min(1),
  name: short.min(2),
  status: z.enum(orderStatuses),
  progress: z.number().int().min(0).max(100),
  current_step: short,
  completed_steps: long,
  next_step: long,
  questions: long,
  due_date: z.iso.date().nullable(),
  due_kind: z.enum(["Voraussichtlich", "Vereinbart"]),
  contact: short,
  customer_visible: visible,
  internal_notes: long,
});
const website = z.object({
  customer_id: id,
  name: short.min(2),
  domain: short,
  project_id: optionalId,
  status: short,
  plan: short,
  contract_id: optionalId,
  contact: short,
  assignee_id: optionalId,
  features: long,
  internal_notes: long,
  customer_visible: visible,
});
const document = z.object({
  customer_id: id,
  title: short.min(2),
  kind: z.enum(["Vertrag", "Dokument"]),
  body: z.string().max(100000),
  customer_visible: visible,
});
export async function GET() {
  try {
    await portalStaff();
    return NextResponse.json(await portalAdminSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Zugriff nicht erlaubt." },
      { status: 401 },
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
    const u = await portalStaff();
    const c = db();
    const raw = z
      .object({
        action: z.string(),
        id: id.optional(),
        payload: z.record(z.string(), z.unknown()),
      })
      .parse(await request.json());
    const p = raw.payload;
    let result;
    const owns = async (
      table: string,
      entity: string | null,
      customerId: string,
    ) => {
      if (!entity) return;
      const r = await c
        .from(table)
        .select("id")
        .eq("id", entity)
        .eq("customer_id", customerId)
        .maybeSingle();
      if (r.error || !r.data) throw Error("Fremde Zuordnung");
    };
    const staff = async (entity: string | null) => {
      if (!entity) return;
      const r = await c
        .from("nc_users")
        .select("id")
        .eq("id", entity)
        .eq("active", true)
        .in("role", ["global_admin", "employee", "finance"])
        .maybeSingle();
      if (!r.data) throw Error("Mitarbeiter fehlt");
    };
    if (["order", "website", "document"].includes(raw.action)) {
      const value: Record<string, unknown> & { customer_id: string } =
        raw.action === "order"
          ? order.parse(p)
          : raw.action === "website"
            ? website.parse(p)
            : document.parse(p);
      const table = {
        order: "nc_orders",
        website: "nc_websites",
        document: "nc_documents",
      }[raw.action]!;
      if (raw.id) await owns(table, raw.id, value.customer_id); // ownership cannot be changed by an update
      if (raw.action === "website") {
        const w = website.parse(p);
        await staff(w.assignee_id);
        await owns("nc_projects", w.project_id, w.customer_id);
        await owns("nc_documents", w.contract_id, w.customer_id);
      }
      result = raw.id
        ? await c.from(table).update(value).eq("id", raw.id)
        : await c.from(table).insert(value);
    } else if (raw.action === "order_websites") {
      const v = z
        .object({
          order_id: id,
          customer_id: id,
          website_ids: z.array(id).max(1000),
        })
        .parse(p);
      result = await c.rpc("nc_set_order_websites", {
        p_order: v.order_id,
        p_customer: v.customer_id,
        p_websites: [...new Set(v.website_ids)],
      });
    } else if (raw.action === "ticket") {
      const v = z
        .object({
          id,
          customer_id: id,
          website_id: optionalId,
          order_id: optionalId,
          project_id: optionalId,
          subscription_id: optionalId,
          assignee_id: optionalId,
          team: short,
          status: z.enum([
            "Eingegangen",
            "In Bearbeitung",
            "Rückfrage",
            "Gelöst",
          ]),
          internal_notes: long,
        })
        .parse(p);
      await owns("nc_tickets", v.id, v.customer_id);
      await Promise.all([
        owns("nc_websites", v.website_id, v.customer_id),
        owns("nc_orders", v.order_id, v.customer_id),
        owns("nc_projects", v.project_id, v.customer_id),
        staff(v.assignee_id),
      ]);
      if (v.subscription_id) {
        const s = await c
          .from("nc_subscriptions")
          .select("project_id")
          .eq("id", v.subscription_id)
          .single();
        if (!s.data) throw Error("Tarif fehlt");
        await owns("nc_projects", s.data.project_id, v.customer_id);
      }
      result = await c
        .from("nc_tickets")
        .update({
          ...v,
          assignment_status: v.website_id
            ? "Zugeordnet"
            : "Website-Zuordnung erforderlich",
        })
        .eq("id", v.id);
    } else if (raw.action === "suggest") {
      const v = z.object({ id }).parse(p);
      const t = await c
        .from("nc_tickets")
        .select("customer_id,subject,description")
        .eq("id", v.id)
        .single();
      if (!t.data) throw Error("Ticket fehlt");
      const suggestion = await ticketSuggestions(
        t.data.customer_id,
        t.data.subject + "\n" + t.data.description,
      );
      result = await c.from("nc_tickets").update({ suggestion }).eq("id", v.id);
    } else if (raw.action === "message") {
      const v = z
        .object({
          ticket_id: id,
          customer_id: id,
          body: long.min(1),
          customer_visible: visible,
        })
        .parse(p);
      await owns("nc_tickets", v.ticket_id, v.customer_id);
      result = await c
        .from("nc_ticket_messages")
        .insert({ ...v, author: "NEX Consulting" });
    } else if (raw.action === "employee_account") {
      await admin();
      const v = z
        .object({
          username: z
            .string()
            .trim()
            .regex(/^[a-zA-Z0-9_.@-]{3,80}$/),
          password: z.string().min(12).max(256),
        })
        .parse(p);
      result = await c.from("nc_users").insert({
        username: v.username,
        password_hash: hashPassword(v.password),
        role: "employee",
      });
    } else if (raw.action === "account") {
      await admin();
      const v = z
        .object({
          customer_id: id,
          username: z
            .string()
            .trim()
            .regex(/^[a-zA-Z0-9_.@-]{3,80}$/),
          password: z.string().min(12).max(256),
        })
        .parse(p);
      result = await c.from("nc_users").insert({
        customer_id: v.customer_id,
        username: v.username,
        password_hash: hashPassword(v.password),
        role: "customer",
      });
    } else if (raw.action === "account_active") {
      await admin();
      const v = z.object({ id, active: z.boolean() }).parse(p);
      result = await c
        .from("nc_users")
        .update({ active: v.active })
        .eq("id", v.id)
        .in("role", ["customer", "employee"]);
      if (!v.active) await c.from("nc_sessions").delete().eq("user_id", v.id);
    } else if (raw.action === "visibility") {
      const v = z
        .object({
          id,
          entity: z.enum(["invoices", "subscriptions"]),
          customer_visible: visible,
        })
        .parse(p);
      let q = c
        .from("nc_" + v.entity)
        .update({ customer_visible: v.customer_visible })
        .eq("id", v.id);
      if (v.entity === "invoices" && v.customer_visible)
        q = q.in("status", ["issued", "paid", "cancelled"]);
      result = await q.select("id").single();
    } else throw Error("Unbekannte Aktion");
    if (result?.error) throw result.error;
    await c.from("nc_audit").insert({
      user_id: u.id,
      action: "portal." + raw.action,
      entity_id: raw.id || null,
    });
    return NextResponse.json(await portalAdminSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Speichern fehlgeschlagen. Bitte Pflichtfelder und Kundenzuordnungen prüfen.",
      },
      {
        status: e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 400,
      },
    );
  }
}
