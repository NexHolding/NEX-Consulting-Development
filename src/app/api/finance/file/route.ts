import { z } from "zod";
import { admin, db } from "@/lib/server";
import { record, sourceFetch, financeHeaders } from "@/lib/finance/server";
export async function GET(request: Request) {
  try {
    await admin();
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const r = await record(id);
    const attachment = r.attachment;
    if (!attachment) throw Error("Keine Datei hinterlegt.");
    let url: string;
    if (r.source === "nex" && attachment.path) {
      const f = await db()
        .storage.from("nex-finance")
        .createSignedUrl(attachment.path, 60, { download: attachment.name });
      if (f.error || !f.data) throw Error("Datei nicht verfügbar.");
      url = f.data.signedUrl;
    } else if (attachment.remote_id) {
      const response = await sourceFetch(
        r.source,
        "/api/integrations/nex-accounting/file?id=" +
          encodeURIComponent(attachment.remote_id),
      );
      const body = await response.json();
      const target = new URL(body.url);
      if (
        target.protocol !== "https:" ||
        !target.hostname.endsWith(".supabase.co") ||
        !target.pathname.startsWith("/storage/v1/object/sign/")
      )
        throw Error("Ungültige Download-Adresse.");
      url = target.toString();
    } else throw Error("Original nur im Quellsystem verfügbar.");
    return new Response(null, {
      status: 302,
      headers: {
        ...financeHeaders,
        Location: url,
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Datei nicht verfügbar." },
      {
        status: e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 404,
        headers: financeHeaders,
      },
    );
  }
}
