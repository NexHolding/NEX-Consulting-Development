import "server-only";
import { db } from "./server";
import { offerCatalogSchema } from "./offer-schema";
export async function readOfferCatalog() {
  const { data, error } = await db()
    .from("nc_offer_catalog")
    .select("version,document")
    .eq("id", 1)
    .single();
  if (error || !data) throw Error("Leistungskatalog noch nicht verfügbar.");
  return offerCatalogSchema.parse({ ...data.document, version: data.version });
}
