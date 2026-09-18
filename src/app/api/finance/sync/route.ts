import { admin, db, sameOrigin } from "@/lib/server";
import { syncSource, financeHeaders } from "@/lib/finance/server";
export const maxDuration = 120;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Nicht erlaubt." },
      { status: 403, headers: financeHeaders },
    );
  try {
    await admin();
    const { source } = await request.json();
    if (
      !["insolvenzhelden", "finanzhelden", "goldhelden", "posthelden"].includes(
        source,
      )
    )
      throw Error("Unbekannte Quelle.");
    return Response.json(
      { ok: true, changed: await syncSource(source) },
      { headers: financeHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Abgleich fehlgeschlagen.";
    return Response.json(
      { error: message },
      {
        status: message === "UNAUTHORIZED" ? 401 : 400,
        headers: financeHeaders,
      },
    );
  }
}
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return new Response(null, { status: 401, headers: financeHeaders });
  const { data, error } = await db()
    .from("nc_finance_sources")
    .select("code")
    .eq("enabled", true)
    .neq("code", "nex")
    .not("base_url", "is", null);
  if (error)
    return Response.json(
      { error: "Quellen nicht verfügbar." },
      { status: 503, headers: financeHeaders },
    );
  const results = [];
  for (const source of data ?? []) {
    try {
      results.push({
        source: source.code,
        changed: await syncSource(source.code),
        ok: true,
      });
    } catch {
      results.push({ source: source.code, ok: false });
    }
  }
  return Response.json(
    { results },
    { status: results.some((r) => !r.ok) ? 503 : 200, headers: financeHeaders },
  );
}
