import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { admin, db, limit, sameOrigin } from "@/lib/server";
import { accessSchema, infrastructureSchema } from "@/lib/access-schema";
import {
  credentialsConfigured,
  decryptCredential,
  encryptCredential,
} from "@/lib/credential-crypto.mjs";
export const runtime = "nodejs";
const metadata =
  "id,customer_id,service,label,login_url,username,two_factor,approval,notes,updated_at";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}
function failure(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return json({ error: "Kein Zugriff auf Kundenzugänge." }, 401);
  return json(
    {
      error:
        error instanceof z.ZodError
          ? "Bitte Dienst, Benutzername, Passwort und Eingaben prüfen."
          : "Zugangsdaten konnten nicht verarbeitet werden. Bitte erneut versuchen.",
    },
    400,
  );
}
export async function GET(request: Request) {
  try {
    await admin();
    const customer = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("customer"));
    const client = db();
    const exists = await client
      .from("nc_customers")
      .select("id")
      .eq("id", customer)
      .single();
    if (exists.error) return json({ error: "Kunde nicht gefunden." }, 404);
    const [credentials, infrastructure] = await Promise.all([
      client
        .from("nc_credentials")
        .select(metadata)
        .eq("customer_id", customer)
        .order("service")
        .limit(1000),
      client
        .from("nc_customer_infrastructure")
        .select("*")
        .eq("customer_id", customer)
        .order("domain")
        .limit(1000),
    ]);
    if (credentials.error || infrastructure.error) throw Error("LOAD_FAILED");
    return json({
      credentials: credentials.data,
      infrastructure: infrastructure.data,
      configured: credentialsConfigured(),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "Anfrage nicht erlaubt." }, 403);
  try {
    const user = await admin();
    if (Number(request.headers.get("content-length") || 0) > 30000)
      return json({ error: "Anfrage zu groß." }, 413);
    const raw = z
      .object({
        action: z.enum([
          "create",
          "update",
          "delete",
          "reveal",
          "infrastructure_save",
          "infrastructure_delete",
        ]),
        customer_id: z.string().uuid(),
        id: z.string().uuid().optional(),
        purpose: z.enum(["view", "copy"]).optional(),
        fields: z.unknown().optional(),
        password: z.string().max(4096).optional(),
      })
      .parse(await request.json());
    const client = db();
    const exists = await client
      .from("nc_customers")
      .select("id")
      .eq("id", raw.customer_id)
      .single();
    if (exists.error) return json({ error: "Kunde nicht gefunden." }, 404);
    if (raw.action === "reveal") {
      if (!raw.id || !raw.purpose) return json({ error: "Zugang fehlt." }, 400);
      if (!credentialsConfigured())
        return json(
          { error: "Passwortspeicher ist noch nicht eingerichtet." },
          503,
        );
      if (!(await limit("credential-read:" + user.id, 60, 60)))
        return json(
          { error: "Bitte einen Moment warten und erneut versuchen." },
          429,
        );
      const r = await client
        .from("nc_credentials")
        .select("id,password_ciphertext")
        .eq("customer_id", raw.customer_id)
        .eq("id", raw.id)
        .single();
      if (r.error) return json({ error: "Zugang nicht gefunden." }, 404);
      const password = decryptCredential(
        r.data.password_ciphertext,
        raw.customer_id,
        raw.id,
      );
      const audit = await client
        .from("nc_audit")
        .insert({
          user_id: user.id,
          action: "credential." + raw.purpose,
          entity_id: raw.id,
          detail: { customer_id: raw.customer_id },
        });
      if (audit.error) throw Error("AUDIT_FAILED");
      return json({ password });
    }
    if (raw.action === "infrastructure_save") {
      const fields = infrastructureSchema.parse(raw.fields);
      const r = raw.id
        ? await client
            .from("nc_customer_infrastructure")
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq("customer_id", raw.customer_id)
            .eq("id", raw.id)
            .select("id")
            .single()
        : await client
            .from("nc_customer_infrastructure")
            .insert({ ...fields, customer_id: raw.customer_id })
            .select("id")
            .single();
      if (r.error) throw Error("SAVE_FAILED");
      return json({ ok: true });
    }
    if (raw.action === "infrastructure_delete") {
      if (!raw.id) throw Error("ID_REQUIRED");
      const r = await client
        .from("nc_customer_infrastructure")
        .delete()
        .eq("customer_id", raw.customer_id)
        .eq("id", raw.id)
        .select("id")
        .single();
      if (r.error) throw Error("DELETE_FAILED");
      return json({ ok: true });
    }
    const id = raw.action === "create" ? randomUUID() : raw.id;
    if (!id) throw Error("ID_REQUIRED");
    const fields =
      raw.action === "delete" ? {} : accessSchema.parse(raw.fields);
    if (raw.action === "create" && !raw.password)
      throw Error("PASSWORD_REQUIRED");
    if (raw.action !== "delete" && !credentialsConfigured())
      return json(
        { error: "Passwortspeicher ist noch nicht eingerichtet." },
        503,
      );
    const ciphertext =
      raw.action !== "delete" && raw.password
        ? encryptCredential(raw.password, raw.customer_id, id)
        : null;
    const result = await client.rpc("nc_write_credential", {
      p_user: user.id,
      p_customer: raw.customer_id,
      p_id: id,
      p_action: raw.action,
      p_fields: fields,
      p_ciphertext: ciphertext,
    });
    if (result.error) throw Error("SAVE_FAILED");
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
