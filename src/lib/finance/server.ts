import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/server";
import {
  encryptCredential,
  decryptCredential,
} from "@/lib/credential-crypto.mjs";
import { financeImportSchema } from "./schema";
import type { FinanceSnapshot, FinanceRecord } from "./model";
export const financeHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function financeSnapshot(): Promise<FinanceSnapshot> {
  const c = db();
  const names = [
    "records",
    "brands",
    "sources",
    "matches",
    "payments",
    "settings",
  ] as const;
  const selections = {
    sources: "code,name,status,last_sync,last_error,record_count,enabled",
    settings: "allocation",
  };
  const lists = await Promise.all(
    names.map(async (name) => {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const r = await c
          .from("nc_finance_" + name)
          .select(
            name in selections
              ? selections[name as keyof typeof selections]
              : "*",
          )
          .order(
            name === "settings"
              ? "id"
              : name === "brands" || name === "sources"
                ? "code"
                : "id",
          )
          .range(offset, offset + 999);
        if (r.error) throw Error("Buchhaltung konnte nicht geladen werden.");
        rows.push(...r.data);
        if (r.data.length < 1000) break;
      }
      return rows;
    }),
  );
  return {
    ...Object.fromEntries(names.map((n, i) => [n, lists[i]])),
    allocation: (lists[5][0] as { allocation: FinanceSnapshot["allocation"] })
      ?.allocation ?? { mode: "none", weights: {} },
    captured_at: new Date().toISOString(),
  } as FinanceSnapshot;
}
export async function record(id: string) {
  const r = await db()
    .from("nc_finance_records")
    .select("*")
    .eq("id", id)
    .single();
  if (r.error) throw Error("Eintrag nicht gefunden.");
  return r.data as FinanceRecord;
}
export function checkResult<T extends { error: unknown }>(r: T) {
  if (r.error) {
    const e = r.error as { code?: string; message?: string };
    throw Error(
      e.code === "P0001"
        ? e.message
        : e.code === "23505"
          ? "Dieser Eintrag ist bereits vorhanden."
          : "Die Änderung konnte nicht gespeichert werden.",
    );
  }
  return r;
}
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function importFinance(raw: unknown, authenticatedSource: string) {
  const batch = financeImportSchema.parse(raw);
  if (batch.source !== authenticatedSource)
    throw Error("Quellzuordnung passt nicht zur Schnittstelle.");
  const brands =
    (await db().from("nc_finance_brands").select("code")).data ?? [];
  const allowed = new Set(brands.map((b) => b.code));
  const identities = new Set<string>();
  for (const r of batch.records) {
    const identity = r.kind + ":" + r.external_id;
    if (identities.has(identity))
      throw Error("Doppelte Quell-ID im selben Export.");
    identities.add(identity);
    if (!allowed.has(r.brand)) throw Error("Unbekannte Kostenstelle.");
    if (
      r.kind === "document" &&
      ["incoming_invoice", "outgoing_invoice"].includes(r.data.document_kind) &&
      r.state === "posted" &&
      r.data.net + r.data.tax !== r.data.gross
    )
      throw Error("Quellbeleg enthält widersprüchliche Beträge.");
  }
  if (Date.parse(batch.generated_at) > Date.now() + 300000)
    throw Error("Zeitstempel der Quelle liegt in der Zukunft.");
  const canonical = JSON.stringify({
    mode: batch.mode,
    records: batch.records,
  });
  const r = checkResult(
    await db().rpc("nc_finance_import", {
      p_source: batch.source,
      p_batch: batch.batch_id,
      p_hash: digest(canonical),
      p_records: batch.records,
      p_snapshot: batch.mode === "snapshot",
      p_generated: batch.generated_at,
    }),
  );
  return r.data;
}
const sourceHosts: Record<string, string> = {
  insolvenzhelden: "insolvenzhelden-six.vercel.app",
  finanzhelden: "finanz-helden.vercel.app",
  goldhelden: "gold-helden.vercel.app",
};
export async function provisionSource(code: string, userId: string) {
  if (
    !["insolvenzhelden", "finanzhelden", "goldhelden", "posthelden"].includes(
      code,
    )
  )
    throw Error("Unbekannte Quelle.");
  const token = randomBytes(32).toString("hex");
  checkResult(
    await db()
      .from("nc_finance_sources")
      .update({
        token_hash: digest(token),
        credential_ciphertext: encryptCredential(token, "finance", code),
        enabled: true,
        status: "prepared",
        base_url: sourceHosts[code] ? "https://" + sourceHosts[code] : null,
      })
      .eq("code", code),
  );
  checkResult(
    await db()
      .from("nc_finance_audit")
      .insert({
        user_id: userId,
        action: "source.token_rotated",
        detail: { source: code },
      }),
  );
  return token;
}
export async function sourceFetch(code: string, path: string) {
  const r = await db()
    .from("nc_finance_sources")
    .select("enabled,base_url,credential_ciphertext")
    .eq("code", code)
    .single();
  const s = r.data;
  if (!s?.enabled || !s.credential_ciphertext || !s.base_url)
    throw Error("Schnittstelle zuerst einrichten.");
  const url = new URL(s.base_url);
  if (url.protocol !== "https:" || sourceHosts[code] !== url.hostname)
    throw Error("Quelladresse ist nicht freigegeben.");
  const response = await fetch(new URL(path, url), {
    headers: {
      Authorization:
        "Bearer " + decryptCredential(s.credential_ciphertext, "finance", code),
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error(
      response.status === 404
        ? "Die Export-Schnittstelle ist im Quellprojekt noch nicht veröffentlicht."
        : "Die Quelle ist nicht erreichbar oder hat die Verbindung abgelehnt.",
    );
  return response;
}

export async function syncSource(source: string) {
  try {
    const response = await sourceFetch(
      source,
      "/api/integrations/nex-accounting/export",
    );
    const text = await response.text();
    if (text.length > 2500000)
      throw Error(
        "Export zu groß. Die Schnittstelle muss für diesen Datenumfang erweitert werden.",
      );
    return await importFinance(JSON.parse(text), source);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Abgleich fehlgeschlagen.";
    await db()
      .from("nc_finance_sources")
      .update({ status: "error", last_error: message.slice(0, 2000) })
      .eq("code", source);
    throw e;
  }
}
