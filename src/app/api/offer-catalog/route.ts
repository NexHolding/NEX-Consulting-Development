import { z } from "zod";
import { NextResponse } from "next/server";
import { admin, db, sameOrigin } from "@/lib/server";
import { readOfferCatalog } from "@/lib/offer-server";
import { offerCatalogSchema } from "@/lib/offer-schema";
export async function GET() {
  try {
    return NextResponse.json(await readOfferCatalog(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Konfigurator derzeit nicht verfügbar. Bitte später erneut versuchen.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const user = await admin();
    const text = await request.text();
    if (text.length > 180000) return new Response(null, { status: 413 });
    const catalog = offerCatalogSchema.parse(JSON.parse(text));
    const r = await db().rpc("nc_save_offer_catalog", {
      p_user: user.id,
      p_version: catalog.version,
      p_document: catalog,
    });
    if (r.error)
      return NextResponse.json(
        {
          error:
            "Katalog wurde zwischenzeitlich geändert oder konnte nicht gespeichert werden. Bitte neu laden.",
        },
        { status: 409 },
      );
    return NextResponse.json(await readOfferCatalog());
  } catch (e) {
    const unauthorized = e instanceof Error && e.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        error: unauthorized
          ? "Bitte anmelden."
          : e instanceof z.ZodError
            ? e.issues[0].message
            : "Bitte Katalogeingaben prüfen.",
      },
      { status: unauthorized ? 401 : 400 },
    );
  }
}
