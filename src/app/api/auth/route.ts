import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ipKey, limit, sameOrigin } from "@/lib/server";
import { hashToken, randomToken, verifyPassword } from "@/lib/security.mjs";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Anfrage nicht erlaubt." },
      { status: 403 },
    );
  try {
    const input = z
      .object({
        username: z.string().min(1).max(80),
        password: z.string().min(1).max(256),
      })
      .parse(await request.json());
    if (
      !(await limit("login:ip:" + ipKey(request), 30, 900)) ||
      !(await limit(
        "login:user:" + hashToken(input.username.toLowerCase()),
        10,
        900,
      ))
    )
      return NextResponse.json(
        { error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." },
        { status: 429 },
      );
    const { data } = await db()
      .from("nc_users")
      .select("*")
      .ilike("username", input.username.replace(/[%_]/g, "\\$&"))
      .maybeSingle();
    const valid = verifyPassword(
      input.password,
      data?.password_hash ||
        "00000000000000000000000000000000:" + "00".repeat(64),
    );
    if (!data?.active || !valid || data.role !== "global_admin")
      return NextResponse.json(
        { error: "Benutzername oder Passwort stimmt nicht." },
        { status: 401 },
      );
    const token = randomToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 12);
    const { error } = await db()
      .from("nc_sessions")
      .insert({
        token_hash: hashToken(token),
        user_id: data.id,
        expires_at: expires.toISOString(),
      });
    if (error) throw error;
    (await cookies()).set("nc_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Anmeldung derzeit nicht möglich. Bitte Eingaben prüfen und erneut versuchen.",
      },
      { status: 400 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const jar = await cookies();
  const token = jar.get("nc_session")?.value;
  if (token)
    await db().from("nc_sessions").delete().eq("token_hash", hashToken(token));
  jar.delete("nc_session");
  return NextResponse.json({ ok: true });
}
