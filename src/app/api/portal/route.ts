import { NextResponse } from "next/server";
import { z } from "zod";
import { db, sameOrigin, limit } from "@/lib/server";
import { customer, portalSnapshot } from "@/lib/portal-server";
import { ticketSuggestions } from "@/lib/ticket-suggestions";
export async function GET() {
  try {
    const u = await customer();
    return NextResponse.json(await portalSnapshot(u.customer_id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Kundenportal nicht verfügbar." },
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
    const u = await customer();
    const c = db();
    if (!(await limit("portal:" + u.id, 60, 600)))
      return NextResponse.json(
        { error: "Bitte kurz warten." },
        { status: 429 },
      );
    const { action, payload } = z
      .object({
        action: z.enum(["ticket", "message", "contact"]),
        payload: z.record(z.string(), z.unknown()),
      })
      .parse(await request.json());
    if (action === "ticket") {
      const p = z
        .object({
          subject: z.string().trim().min(3).max(200),
          description: z.string().trim().min(5).max(6000),
        })
        .strict()
        .parse(payload);
      // Persist first: classification can fail without losing the ticket.
      const r = await c
        .from("nc_tickets")
        .insert({ ...p, customer_id: u.customer_id })
        .select("id")
        .single();
      if (r.error) throw r.error;
      const suggestion = await ticketSuggestions(
        u.customer_id,
        p.subject + "\n" + p.description,
      );
      await c
        .from("nc_tickets")
        .update({
          suggestion,
          assignment_status:
            suggestion.length === 1
              ? "Vorschlag prüfen"
              : "Website-Zuordnung erforderlich",
        })
        .eq("id", r.data.id)
        .is("website_id", null);
    } else if (action === "message") {
      const p = z
        .object({
          ticket_id: z.string().uuid(),
          body: z.string().trim().min(1).max(6000),
        })
        .strict()
        .parse(payload);
      const t = await c
        .from("nc_tickets")
        .select("id")
        .eq("id", p.ticket_id)
        .eq("customer_id", u.customer_id)
        .maybeSingle();
      if (!t.data) throw Error("Ticket fehlt");
      const r = await c.from("nc_ticket_messages").insert({
        ...p,
        customer_id: u.customer_id,
        author: "Kunde",
        customer_visible: true,
      });
      if (r.error) throw r.error;
    } else {
      const p = z
        .object({
          contact: z.string().trim().max(160),
          email: z.email(),
          address: z.string().max(1000),
        })
        .strict()
        .parse(payload);
      const r = await c.from("nc_customers").update(p).eq("id", u.customer_id);
      if (r.error) throw r.error;
    }
    return NextResponse.json(await portalSnapshot(u.customer_id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Die Aktion konnte nicht gespeichert werden. Bitte Angaben prüfen.",
      },
      {
        status: e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 400,
      },
    );
  }
}
