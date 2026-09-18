import { timingSafeEqual } from "node:crypto";
import { db, limit, ipKey } from "@/lib/server";
import { digest, financeHeaders, importFinance } from "@/lib/finance/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await limit("finance-import:" + ipKey(request), 60, 60)))
    return Response.json(
      { error: "Zu viele Anfragen." },
      { status: 429, headers: financeHeaders },
    );
  try {
    const source = new URL(request.url).searchParams.get("source") || "";
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const s = await db()
      .from("nc_finance_sources")
      .select("token_hash,enabled")
      .eq("code", source)
      .single();
    if (
      !token ||
      !s.data?.enabled ||
      !s.data.token_hash ||
      !timingSafeEqual(
        Buffer.from(digest(token)),
        Buffer.from(s.data.token_hash),
      )
    )
      return Response.json(
        { error: "Nicht autorisiert." },
        { status: 401, headers: financeHeaders },
      );
    const body = await request.text();
    if (Buffer.byteLength(body) > 2500000)
      return Response.json(
        { error: "Batch zu groß." },
        { status: 413, headers: financeHeaders },
      );
    const changed = await importFinance(JSON.parse(body), source);
    return Response.json({ ok: true, changed }, { headers: financeHeaders });
  } catch {
    return Response.json(
      {
        error:
          "Import abgelehnt. Schema, Version, Beträge und Batch-ID prüfen.",
      },
      { status: 400, headers: financeHeaders },
    );
  }
}
