export const financeViews = [
  ["overview", "Übersicht", "Stand & offene Vorgänge"],
  ["documents", "Belege", "Erfassen, prüfen & buchen"],
  ["delivery", "Lieferscheine", "Lieferungen & Originale"],
  ["bank", "Bankabgleich", "Umsätze & Zuordnungen"],
  ["payments", "Zahlungsverkehr", "Fälligkeiten & Freigaben"],
  ["assets", "Anlagen & AfA", "Bestand & Abschreibungen"],
  ["payroll", "Lohnunterlagen", "Monate & Personalaufwand"],
  ["reports", "Auswertungen", "Marken & Gesamtabschluss"],
  ["settings", "Verwaltung", "Kostenstellen & Schnittstellen"],
] as const;
export const brandNames: Record<string, string> = {
  nex: "NEX Consulting · Allgemein",
  insolvenzhelden: "Insolvenzhelden",
  finanzhelden: "Finanzhelden",
  goldhelden: "Goldhelden",
  posthelden: "Posthelden",
  unassigned: "Zuordnung offen",
};
export type FinanceKind =
  "document" | "bank" | "asset" | "depreciation" | "payroll";
export type FinanceData = {
  title: string;
  date: string;
  party: string;
  reference: string;
  category: string;
  document_kind: string;
  net: number;
  tax: number;
  gross: number;
  currency: "EUR";
  due_date: string | null;
  paid_on: string | null;
  iban: string;
  debit: string;
  credit: string;
  tax_account: string;
  recognition: "operating" | "asset" | "neutral";
  payment_status: string;
  cost_center: string;
  notes: string;
  account_ref: string;
  employee_ref: string;
  acquisition_cost: number;
  residual_value: number;
  life_months: number;
  in_service: string | null;
  linked_id: string | null;
  asset_ref: string;
  employer_cost: number;
  net_wage: number;
};
export type FinanceRecord = {
  id: string;
  brand: string;
  source: string;
  external_id: string;
  kind: FinanceKind;
  state: "draft" | "posted" | "reversed";
  version: number;
  data: FinanceData;
  attachment: {
    name: string;
    path?: string;
    remote_id?: string;
    mime?: string;
    size?: number;
  } | null;
  reversal_id: string | null;
  source_revision: string | null;
  updated_at: string;
  missing: boolean;
  classification_override: boolean;
};
export type FinanceBrand = { code: string; name: string; active: boolean };
export type FinanceSource = {
  code: string;
  name: string;
  status: string;
  last_sync: string | null;
  last_error: string | null;
  record_count: number;
  token_set?: boolean;
  enabled: boolean;
};
export type FinanceMatch = {
  id: string;
  bank_id: string;
  document_id: string;
  amount: number;
  created_at: string;
};
export type FinancePayment = {
  id: string;
  document_id: string;
  state: string;
  created_at: string;
};
export type Allocation = {
  mode: "none" | "revenue" | "fixed";
  weights: Record<string, number>;
};
export type FinanceSnapshot = {
  records: FinanceRecord[];
  brands: FinanceBrand[];
  sources: FinanceSource[];
  matches: FinanceMatch[];
  payments: FinancePayment[];
  allocation: Allocation;
  captured_at: string;
};
export const money = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    (cents || 0) / 100,
  );
export function inPeriod(r: FinanceRecord, month: string) {
  return !month || r.data.date.startsWith(month);
}
export function contribution(r: FinanceRecord) {
  if (r.missing || r.state !== "posted") return { income: 0, cost: 0 };
  if (r.kind === "depreciation") return { income: 0, cost: r.data.net };
  if (r.kind !== "document" || r.data.recognition !== "operating")
    return { income: 0, cost: 0 };
  return {
    income: r.data.document_kind === "outgoing_invoice" ? r.data.net : 0,
    cost: r.data.document_kind === "incoming_invoice" ? r.data.net : 0,
  };
}
// Largest remainder allocation keeps every cent; these are internal cost transfers,
// never extra expenses in the consolidated company result.
export function distributeCents(
  total: number,
  weights: Record<string, number>,
) {
  const entries = Object.entries(weights)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const sum = entries.reduce((s, [, n]) => s + n, 0);
  if (!sum) return {};
  const sign = Math.sign(total),
    abs = Math.abs(total);
  const parts = entries.map(([code, w]) => ({
    code,
    amount: Math.floor((abs * w) / sum),
    remainder: ((abs * w) / sum) % 1,
  }));
  let remainder = abs - parts.reduce((s, p) => s + p.amount, 0);
  for (const p of [...parts].sort(
    (a, b) => b.remainder - a.remainder || a.code.localeCompare(b.code),
  )) {
    if (remainder-- > 0) p.amount++;
  }
  return Object.fromEntries(parts.map((p) => [p.code, sign * p.amount]));
}
export function summarize(
  records: FinanceRecord[],
  brands: FinanceBrand[],
  allocation: Allocation,
  period = "",
) {
  const scoped = records.filter((r) => inPeriod(r, period));
  const rows = brands.map((b) => {
    const entries = scoped.filter((r) => r.brand === b.code);
    const totals = entries.reduce(
      (s, r) => {
        const c = contribution(r);
        return { income: s.income + c.income, cost: s.cost + c.cost };
      },
      { income: 0, cost: 0 },
    );
    return {
      ...b,
      ...totals,
      allocated: 0,
      result: totals.income - totals.cost,
      documents: entries.filter((r) => r.kind === "document").length,
    };
  });
  const overhead = scoped
    .filter((r) => r.brand === "nex" && r.data.cost_center === "allgemein")
    .reduce((s, r) => s + contribution(r).cost, 0);
  const weights =
    allocation.mode === "fixed"
      ? allocation.weights
      : allocation.mode === "revenue"
        ? Object.fromEntries(
            rows
              .filter((r) => !["nex", "unassigned"].includes(r.code))
              .map((r) => [r.code, Math.max(0, r.income)]),
          )
        : {};
  const allocated = distributeCents(overhead, weights);
  for (const r of rows) {
    r.allocated =
      r.code === "nex"
        ? -Object.values(allocated).reduce((s, n) => s + n, 0)
        : allocated[r.code] || 0;
    r.result = r.income - r.cost - r.allocated;
  }
  return {
    rows,
    income: rows.reduce((s, r) => s + r.income, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
    overhead,
    unallocated: overhead - Object.values(allocated).reduce((s, n) => s + n, 0),
  };
}
export function depreciationForMonth(asset: FinanceRecord, month: string) {
  const d = asset.data;
  if (asset.kind !== "asset" || asset.state !== "posted" || !d.in_service)
    return 0;
  const [y, m] = month.split("-").map(Number),
    [sy, sm] = d.in_service.split("-").map(Number);
  const index = (y - sy) * 12 + m - sm;
  if (index < 0 || index >= d.life_months) return 0;
  const basis = d.acquisition_cost - d.residual_value;
  return (
    Math.floor((basis * (index + 1)) / d.life_months) -
    Math.floor((basis * index) / d.life_months)
  );
}
export function journalLines(r: FinanceRecord) {
  if (
    r.state !== "posted" ||
    r.missing ||
    !["document", "depreciation"].includes(r.kind) ||
    (!["incoming_invoice", "outgoing_invoice"].includes(r.data.document_kind) &&
      r.kind !== "depreciation")
  )
    return [];
  const d = r.data,
    outgoing = d.document_kind === "outgoing_invoice";
  const rows = [
    { account: d.debit, amount: outgoing ? d.gross : d.net },
    { account: d.credit, amount: -(outgoing ? d.net : d.gross) },
  ];
  if (d.tax)
    rows.push({ account: d.tax_account, amount: outgoing ? -d.tax : d.tax });
  return rows.filter((x) => x.amount !== 0);
}
export function parseMoney(value: string) {
  const normalized = value
    .trim()
    .replace(/\s|€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized))
    throw Error("Betrag bitte als 1.234,56 eingeben.");
  const n = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(n) || Math.abs(n) > 99999999999)
    throw Error("Betrag zu groß.");
  return n;
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+@\t\r]/.test(s) || (s.startsWith("-") && !/^-\d+(\.\d+)?$/.test(s)))
    s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function isIban(value: string) {
  const iban = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  let rest = 0;
  for (const c of iban.slice(4) + iban.slice(0, 4)) {
    for (const digit of /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c)
      rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
}
