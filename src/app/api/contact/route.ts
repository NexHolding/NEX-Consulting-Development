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
        package: z.enum(["Launch", "Business", "Enterprise", "Noch offen"]),
        message: z.string().trim().min(15).max(5000),
        website: z.literal(""),
      })
      .parse(await request.json());
    const { website, ...lead } = p;
    void website;
    const { error } = await db().from("nc_leads").insert(lead);
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
