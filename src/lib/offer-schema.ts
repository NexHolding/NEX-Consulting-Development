import { z } from "zod";
export const offerSelectionSchema = z.object({
  budget: z.number().int().min(1000).max(100000),
  logo: z.boolean(),
  domains: z.number().int().min(0).max(50),
  domainFee: z.number().int().min(2).max(5),
  catalogVersion: z.number().int().positive(),
});
export const offerCatalogSchema = z
  .object({
    version: z.number().int().positive(),
    points: z
      .array(
        z.object({
          budget: z.number().int().min(1000).max(100000),
          monthly: z.number().int().min(49).max(5000),
        }),
      )
      .min(2)
      .max(20),
    services: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z][a-z0-9_]{1,60}$/),
          group: z.string().trim().min(2).max(80),
          label: z.string().trim().min(2).max(160),
          unit: z.string().trim().min(1).max(40),
          description: z.string().trim().min(3).max(800),
          quantities: z
            .array(z.number().int().min(0).max(100000))
            .min(2)
            .max(20),
        }),
      )
      .min(5)
      .max(100),
  })
  .superRefine((c, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (
      c.points[0]?.budget !== 1000 ||
      c.points.at(-1)?.budget !== 100000 ||
      c.points[0]?.monthly !== 49 ||
      c.points.at(-1)?.monthly !== 5000
    )
      fail("Budgetgrenzen 1.000–100.000 und Betreuung 49–5.000 beibehalten.");
    if (
      c.points.some(
        (p, i) =>
          i > 0 &&
          (p.budget <= c.points[i - 1].budget ||
            p.monthly < c.points[i - 1].monthly),
      )
    )
      fail("Preisstufen müssen aufsteigend sein.");
    if (new Set(c.services.map((s) => s.id)).size !== c.services.length)
      fail("Leistungskennungen müssen eindeutig sein.");
    for (const id of [
      "corrections",
      "changes",
      "care_minutes",
      "care_requests",
    ])
      if (!c.services.some((s) => s.id === id)) fail("Kontingent fehlt: " + id);
    for (const s of c.services) {
      if (
        s.quantities.length !== c.points.length ||
        s.quantities.some((q, i) => i > 0 && q < s.quantities[i - 1])
      )
        fail("Mengen müssen vollständig und aufsteigend sein: " + s.label);
      if (
        s.id === "changes" &&
        s.quantities.some((q, i) => c.points[i]?.budget < 10000 && q !== 0)
      )
        fail("Basic enthält keine Komplettänderungen.");
      if (
        ["changes", "corrections"].includes(s.id) &&
        s.quantities.some((q) => q > 999)
      )
        fail("Maximal 999 Runden.");
    }
  });
