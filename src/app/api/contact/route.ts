import { readOfferCatalog } from "@/lib/offer-server";
import { offerSelectionSchema } from "@/lib/offer-schema";
import { calculateOffer } from "@/lib/offer-catalog";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ipKey, limit, sameOrigin } from "@/lib/server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    if (!(await limit("contact:" + ipKey(request), 5, 3600)))
      return NextResponse.json(
        { error: "Bitte später erneut versuchen." },
        { status: 429 },
      );
    const p = z
      .object({
        name: z.string().trim().min(2).max(160),
        company: z.string().max(160),
        email: z.email(),
        package: z.enum([
          "Basic",
          "Launch",
          "Business",
          "Enterprise",
          "Noch offen",
        ]),
        configuration: offerSelectionSchema.optional(),
        message: z.string().trim().min(15).max(5000),
        website: z.literal(""),
      })
      .parse(await request.json());
    const { website, configuration, ...lead } = p;
    let offer_snapshot = null;
    if (configuration) {
      const catalog = await readOfferCatalog();
      if (configuration.catalogVersion !== catalog.version)
        return NextResponse.json(
          {
            error:
              "Der Leistungskatalog wurde aktualisiert. Bitte Seite neu laden und Konfiguration erneut prüfen.",
          },
          { status: 409 },
        );
      offer_snapshot = calculateOffer(catalog, configuration);
      lead.package = offer_snapshot.package as typeof lead.package;
    }
    void website;
    const { error } = await db()
      .from("nc_leads")
      .insert({ ...lead, offer_snapshot });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Bitte Eingaben prüfen. Die Anfrage wurde noch nicht gespeichert.",
      },
      { status: 400 },
    );
  }
}
