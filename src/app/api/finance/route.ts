import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { admin, db, sameOrigin } from "@/lib/server";
import {
  allocationSchema,
  financeDataSchema,
  financeRecordSchema,
} from "@/lib/finance/schema";
import {
  financeHeaders,
  financeSnapshot,
  checkResult,
  record,
  provisionSource,
} from "@/lib/finance/server";
import { depreciationForMonth, isIban } from "@/lib/finance/model";
const uuid = z.uuid();
const json = (v: unknown, status = 200) =>
  NextResponse.json(v, { status, headers: financeHeaders });
export async function GET() {
  try {
    await admin();
    return json(await financeSnapshot());
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Laden fehlgeschlagen." },
      e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 400,
    );
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "Anfrage nicht erlaubt." }, 403);
  try {
    const user = await admin();
    if (Number(request.headers.get("content-length") || 0) > 1000000)
      return json({ error: "Anfrage zu groß." }, 413);
    const raw = z
      .object({
        action: z.string(),
        payload: z.record(z.string(), z.unknown()),
      })
      .parse(await request.json());
    const p = raw.payload,
      c = db();
    let result: unknown = {};
    if (raw.action === "save") {
      const v = financeRecordSchema.parse(p);
      if (v.kind === "depreciation") throw Error("AfA über die Anlage buchen.");
      const r = checkResult(
        await c.rpc("nc_finance_save", {
          p_user: user.id,
          p_id: v.id ?? null,
          p_version: v.version ?? null,
          p_brand: v.brand,
          p_kind: v.kind,
          p_data: v.data,
        }),
      );
      result = { id: r.data };
    } else if (raw.action === "prepare_upload") {
      const v = z
        .object({
          brand: z.string(),
          document_kind: z.enum([
            "incoming_invoice",
            "outgoing_invoice",
            "delivery_note",
            "payroll",
            "contract",
            "other",
          ]),
          name: z.string().min(1).max(240),
          mime: z.enum([
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
          ]),
          size: z.number().int().min(1).max(20971520),
        })
        .parse(p);
      const id = randomUUID(),
        path = id + "/" + randomUUID();
      const signed = checkResult(
        await c.storage.from("nex-finance").createSignedUploadUrl(path),
      );
      const d = financeDataSchema.parse({
        title: v.name,
        date: new Date().toISOString().slice(0, 10),
        document_kind: v.document_kind,
      });
      const r = checkResult(
        await c.rpc("nc_finance_save", {
          p_user: user.id,
          p_id: null,
          p_version: null,
          p_brand: v.brand,
          p_kind: "document",
          p_data: d,
          p_attachment: { name: v.name, mime: v.mime, size: v.size, path },
        }),
      );
      result = { id: r.data, signed_url: signed.data?.signedUrl };
    } else if (raw.action === "upload_complete") {
      const r = await record(uuid.parse(p.id));
      if (r.source !== "nex" || !r.attachment?.path)
        throw Error("Datei nicht gefunden.");
      const info = checkResult(
        await c.storage.from("nex-finance").info(r.attachment.path),
      );
      if (!info.data) throw Error("Upload noch nicht abgeschlossen.");
      if (
        Number(info.data.size) !== r.attachment.size ||
        info.data.contentType !== r.attachment.mime
      )
        throw Error(
          "Dateigröße oder Dateityp stimmt nicht mit dem Upload überein.",
        );
      result = { ok: true };
    } else if (
      [
        "post",
        "reverse",
        "classify",
        "payment_prepare",
        "payment_approve",
      ].includes(raw.action)
    ) {
      const id = uuid.parse(p.id),
        version = z.number().int().nonnegative().parse(p.version);
      let detail: Record<string, unknown> = {};
      if (raw.action === "reverse")
        detail = z
          .object({
            reason: z.string().trim().min(3).max(1000),
            date: z.iso.date(),
          })
          .parse(p);
      if (raw.action === "classify")
        detail = {
          brand: z
            .string()
            .regex(/^[a-z][a-z0-9_]{1,49}$/)
            .parse(p.brand),
        };
      if (raw.action === "post") {
        const r = await record(id);
        if (r.attachment?.path)
          checkResult(
            await c.storage.from("nex-finance").info(r.attachment.path),
          );
      }
      if (raw.action === "payment_approve") {
        const r = await record(id);
        if (!isIban(r.data.iban))
          throw Error(
            "Bitte zunächst eine gültige Empfänger-IBAN im Entwurf hinterlegen.",
          );
      }
      checkResult(
        await c.rpc("nc_finance_action", {
          p_user: user.id,
          p_id: id,
          p_version: version,
          p_action: raw.action,
          p_detail: detail,
        }),
      );
    } else if (raw.action === "match") {
      const v = z
        .object({
          bank_id: uuid,
          document_id: uuid,
          amount: z.number().int().positive(),
        })
        .parse(p);
      checkResult(
        await c.rpc("nc_finance_match", {
          p_user: user.id,
          p_bank: v.bank_id,
          p_document: v.document_id,
          p_amount: v.amount,
        }),
      );
    } else if (raw.action === "allocation") {
      const allocation = allocationSchema.parse(p);
      checkResult(
        await c.from("nc_finance_settings").update({ allocation }).eq("id", 1),
      );
      checkResult(
        await c.from("nc_finance_audit").insert({
          user_id: user.id,
          action: "allocation.update",
          detail: allocation,
        }),
      );
    } else if (raw.action === "source_token") {
      result = {
        token: await provisionSource(z.string().parse(p.source), user.id),
      };
    } else if (raw.action === "depreciate") {
      const id = uuid.parse(p.id),
        month = z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .parse(p.month);
      const asset = await record(id);
      if (asset.source !== "nex")
        throw Error("AfA für importierte Anlagen wird im Quellsystem gebucht.");
      const amount = depreciationForMonth(asset, month);
      if (amount <= 0) throw Error("Für diesen Monat fällt keine AfA an.");
      if (!asset.data.debit || !asset.data.credit)
        throw Error(
          "Bitte AfA-Aufwandskonto und kumuliertes AfA-Konto an der Anlage hinterlegen.",
        );
      const d = financeDataSchema.parse({
        title: "AfA · " + asset.data.title,
        date: month + "-01",
        net: amount,
        gross: amount,
        debit: asset.data.debit,
        credit: asset.data.credit,
        linked_id: id,
        cost_center: asset.data.cost_center,
        category: "Abschreibungen",
      });
      // The database function calculates again and enforces idempotency atomically.
      checkResult(
        await c.rpc("nc_finance_depreciate", {
          p_user: user.id,
          p_asset: id,
          p_month: month + "-01",
          p_version: asset.version,
          p_data: d,
        }),
      );
    } else if (raw.action === "bank_import") {
      const v = z
        .object({
          brand: z.string(),
          account_ref: z.string().min(2).max(240),
          rows: z
            .array(
              z.object({
                id: z.string().min(1).max(100),
                date: z.iso.date(),
                amount: z.number().int().min(-99999999999).max(99999999999),
                party: z.string().max(240),
                reference: z.string().max(240),
              }),
            )
            .min(1)
            .max(500),
        })
        .parse(p);
      const entries = v.rows.map((row) => ({
        external_id: "bank:" + v.account_ref + ":" + row.id,
        data: financeDataSchema.parse({
          title: row.reference || row.party || "Bankumsatz",
          date: row.date,
          gross: row.amount,
          party: row.party,
          reference: row.reference,
          account_ref: v.account_ref,
        }),
      }));
      checkResult(
        await c.rpc("nc_finance_bank_import", {
          p_user: user.id,
          p_brand: v.brand,
          p_rows: entries,
        }),
      );
    } else return json({ error: "Unbekannte Aktion." }, 400);
    return json({ ok: true, result });
  } catch (e) {
    return json(
      {
        error:
          e instanceof z.ZodError
            ? "Bitte die Eingaben und Pflichtfelder prüfen."
            : e instanceof Error
              ? e.message
              : "Speichern fehlgeschlagen.",
      },
      e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 400,
    );
  }
}
