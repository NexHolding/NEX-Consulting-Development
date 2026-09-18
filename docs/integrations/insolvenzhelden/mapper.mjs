import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
export function authorized(request, secret) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  return (
    /^[a-f0-9]{64}$/.test(secret || "") &&
    /^[a-f0-9]{64}$/.test(token) &&
    timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  );
}
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const text = (v) => String(v ?? "");
const cents = (v) => {
  const n = Number(v ?? 0);
  if (!Number.isSafeInteger(n) || Math.abs(n) > 99999999999)
    throw Error("Invalid source amount");
  return n;
};
const date = (v) => {
  const d = text(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw Error("Missing source date");
  return d;
};
const relation = (v) => (Array.isArray(v) ? v[0] : v);
export function mapAccounting(
  { documents, assets, depreciation, payroll, bank },
  generatedAt = new Date().toISOString(),
) {
  const records = [];
  const add = (
    kind,
    row,
    state,
    data,
    attachment = null,
    brand = "insolvenzhelden",
  ) => {
    const base = { external_id: row.id, kind, brand, state, data, attachment };
    records.push({ ...base, revision: hash(base) });
  };
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const assetDocuments = new Set(
    assets.map((a) => a.document_id).filter(Boolean),
  );
  for (const r of documents) {
    if (r.currency !== "EUR")
      throw Error("Only EUR source documents supported");
    const asset =
      assetDocuments.has(r.id) ||
      (r.document_kind === "incoming_invoice" &&
        /^0/.test(text(r.debit_account_skr04)));
    const booking = r.booking_status || "draft";
    add(
      "document",
      r,
      booking,
      {
        title: text(
          r.booking_text ||
            r.original_file_name ||
            r.invoice_number ||
            "Quellbeleg",
        ).slice(0, 240),
        date: date(r.booking_date || r.document_date || r.created_at),
        party: text(r.counterparty_name),
        reference: text(r.invoice_number || r.booking_reference),
        document_kind: r.document_kind,
        net: cents(r.net_cents),
        tax: cents(r.tax_cents),
        gross: cents(r.gross_cents),
        currency: "EUR",
        due_date: r.due_date || null,
        paid_on: r.paid_at ? date(r.paid_at) : null,
        payment_status: r.payment_status || "not_applicable",
        debit: text(r.debit_account_skr04),
        credit: text(r.credit_account_skr04),
        tax_account: text(r.tax_account_skr04),
        recognition: asset
          ? "asset"
          : ["incoming_invoice", "outgoing_invoice"].includes(r.document_kind)
            ? "operating"
            : "neutral",
        category: text(relation(r.category)?.name),
        cost_center: text(relation(r.cost_center)?.name || "direkt"),
        notes: text(r.notes).slice(0, 4000),
      },
      r.storage_key
        ? {
            name: text(r.original_file_name || "Beleg").slice(0, 240),
            remote_id: r.id,
            mime: r.content_type || "application/pdf",
            size: Number(r.size_bytes),
          }
        : null,
    );
  }
  for (const r of assets)
    add("asset", r, r.status === "active" ? "posted" : "reversed", {
      title: r.name,
      date: date(r.acquisition_date),
      asset_ref: r.asset_number,
      acquisition_cost: cents(r.acquisition_cost_cents),
      residual_value: cents(r.residual_value_cents),
      life_months: r.useful_life_months || 12,
      in_service: date(r.in_service_date),
      recognition: "asset",
      debit: text(r.depreciation_account_skr04),
      credit: text(r.accumulated_depreciation_account_skr04),
      notes:
        "Quellverfahren: " + r.depreciation_method + "; Status: " + r.status,
      cost_center: "direkt",
    });
  for (const r of depreciation) {
    const a = assetMap.get(r.asset_id);
    if (!a) throw Error("Missing source asset");
    add("depreciation", r, r.status === "planned" ? "draft" : r.status, {
      title: "AfA · " + a.name,
      date: date(r.period_month),
      net: cents(r.amount_cents),
      gross: cents(r.amount_cents),
      debit: text(a.depreciation_account_skr04),
      credit: text(a.accumulated_depreciation_account_skr04),
      asset_ref: a.asset_number,
      reference: text(r.booking_reference),
      recognition: "operating",
      cost_center: "direkt",
    });
  }
  for (const r of payroll)
    if (r.is_current && r.run_type !== "preview")
      add("payroll", r, r.status === "exported" ? "posted" : "draft", {
        title: "Lohnstand · " + r.employee_number,
        date: date(r.period_month),
        employee_ref: r.employee_number,
        net: cents(r.gross_cents),
        employer_cost: cents(r.employer_social_security_cents),
        net_wage: cents(r.net_cents),
        recognition: "neutral",
        notes: "Vorbereitungsstand: " + r.status + " · Version " + r.version,
        cost_center: "direkt",
      });
  for (const r of bank) {
    if (r.currency !== "EUR")
      throw Error("Only EUR bank transactions supported");
    add(
      "bank",
      r,
      r.match_status === "reversed"
        ? "reversed"
        : r.transaction_state === "completed"
          ? "posted"
          : "draft",
      {
        title:
          "Bankumsatz · " +
          text(
            r.counterparty_name || r.payer_display || r.provider_transaction_id,
          ).slice(0, 200),
        date: date(r.completed_at || r.created_at),
        gross:
          (r.direction === "outgoing" ? -1 : 1) *
          Math.abs(cents(r.amount_cents)),
        party: text(r.counterparty_name || r.payer_display),
        reference: text(r.payment_reference),
        account_ref: text(r.provider_account_id),
        recognition: "neutral",
        cost_center: "direkt",
      },
    );
  }
  records.sort((a, b) =>
    (a.kind + ":" + a.external_id).localeCompare(b.kind + ":" + b.external_id),
  );
  if (records.length > 500)
    throw Error(
      "Snapshot exceeds 500 records; upgrade paginated sync before activation",
    );
  return {
    schema_version: 1,
    source: "insolvenzhelden",
    mode: "snapshot",
    generated_at: generatedAt,
    batch_id: randomUUID(),
    records,
  };
}
