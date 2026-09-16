import { NextResponse } from "next/server";
import { admin, db } from "@/lib/server";
import {
  reportWindow,
  reportSeconds,
  type ReportTime,
} from "@/lib/time-report";
import { createTimePdf } from "@/lib/report-pdf";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await admin();
    const q = z
      .object({
        customer: z.string().uuid().optional(),
        project: z.string().uuid().optional(),
        month: z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .optional(),
      })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = db(),
      now = Date.now(),
      window = reportWindow(q.month || "", now);
    let title = "Alle Kunden";
    if (q.customer) {
      const { data, error } = await client
        .from("nc_customers")
        .select("name")
        .eq("id", q.customer)
        .single();
      if (error || !data)
        return NextResponse.json(
          { error: "Kunde nicht gefunden." },
          { status: 404 },
        );
      title = data.name;
    }
    let pq = client
      .from("nc_projects")
      .select(
        "id,name,included_correction_rounds,included_change_rounds,hourly_rate_cents,waiting_billable,offer_snapshot",
      );
    if (q.customer) pq = pq.eq("customer_id", q.customer);
    if (q.project) pq = pq.eq("id", q.project);
    const { data: projects, error } = await pq;
    if (error) throw error;
    if (q.project && !projects.length)
      return NextResponse.json(
        { error: "Projekt nicht gefunden." },
        { status: 404 },
      );
    const rows: ReportTime[] = [];
    if (projects.length) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from("nc_time_entries")
          .select(
            "id,project_id,kind,category,description,started_at,stopped_at,approved_at,approved_rate_cents,correction_round,change_request,change_round,extra_work",
          )
          .in(
            "project_id",
            projects.map((p) => p.id),
          )
          .lt("started_at", new Date(window[1]).toISOString())
          .order("started_at")
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        rows.push(...data.filter((t) => reportSeconds(t, window) > 0));
        if (data.length < 1000) break;
      }
    }
    const pdf = await createTimePdf({
      title: q.project ? title + " · " + projects[0].name : title,
      period: q.month ? "Monatsauszug " + q.month : "Aktueller Gesamtstand",
      now,
      rows,
      projects,
      window,
    });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="NEX-Zeitauszug-' +
          (q.month || "Gesamtstand") +
          '.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === "UNAUTHORIZED"
            ? "Bitte anmelden."
            : "Auszug konnte nicht erstellt werden.",
      },
      {
        status:
          e instanceof Error && e.message === "UNAUTHORIZED"
            ? 401
            : e instanceof z.ZodError
              ? 400
              : 500,
      },
    );
  }
}
