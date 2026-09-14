import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { hashToken } from "./security.mjs";
export function db() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Serververbindung nicht konfiguriert.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function currentUser() {
  const token = (await cookies()).get("nc_session")?.value;
  if (!token) return null;
  const { data } = await db()
    .from("nc_sessions")
    .select("user_id")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const { data: user } = await db()
    .from("nc_users")
    .select("id,username,role,active,customer_id")
    .eq("id", data.user_id)
    .eq("active", true)
    .maybeSingle();
  return user;
}
export async function admin() {
  const user = await currentUser();
  if (!user || user.role !== "global_admin") throw new Error("UNAUTHORIZED");
  return user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === (request.headers.get("host") || new URL(request.url).host)
    );
  } catch {
    return false;
  }
}
export async function limit(key: string, max: number, seconds: number) {
  const { data, error } = await db().rpc("nc_take_limit", {
    p_key: key,
    p_max: max,
    p_seconds: seconds,
  });
  return !error && data === true;
}
export function ipKey(request: Request) {
  return hashToken(
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
  );
}
export async function snapshot() {
  const client = db();
  const names = [
    "customers",
    "projects",
    "time_entries",
    "tasks",
    "leads",
    "subscriptions",
    "invoices",
  ] as const;
  const result = await Promise.all(
    names.map(async (n) => {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const r = await client
          .from("nc_" + n)
          .select("*")
          .order(n === "time_entries" ? "started_at" : "created_at", {
            ascending: false,
          })
          .order("id")
          .range(offset, offset + 999);
        if (r.error) return r;
        rows.push(...r.data);
        if (r.data.length < 1000) return { data: rows, error: null };
      }
    }),
  );
  const out: Record<string, unknown> = { capturedAt: Date.now() };
  result.forEach((r, i) => {
    if (r.error) throw new Error("Daten konnten nicht geladen werden.");
    out[names[i]] = r.data;
  });
  return out;
}
