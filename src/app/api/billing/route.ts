import { db } from "@/lib/server";
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return new Response(null, { status: 401 });
  const { data, error } = await db().rpc("nc_generate_billing");
  return Response.json(
    error ? { error: "Abrechnung fehlgeschlagen." } : { drafts_created: data },
    { status: error ? 500 : 200 },
  );
}
