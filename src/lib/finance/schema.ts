import { z } from "zod";
const cents = z.number().int().min(-99999999999).max(99999999999);
const short = z.string().trim().max(240).default("");
const account = z
  .string()
  .regex(/^$|^\d{4,8}$/)
  .default("");
export const financeDataSchema = z
  .object({
    title: z.string().trim().min(2).max(240),
    date: z.iso.date(),
    party: short,
    reference: short,
    category: short,
    document_kind: z
      .enum([
        "incoming_invoice",
        "outgoing_invoice",
        "delivery_note",
        "payroll",
        "contract",
        "other",
      ])
      .default("other"),
    net: cents.default(0),
    tax: cents.default(0),
    gross: cents.default(0),
    currency: z.literal("EUR").default("EUR"),
    due_date: z.iso.date().nullable().default(null),
    paid_on: z.iso.date().nullable().default(null),
    iban: z.string().trim().max(34).default(""),
    debit: account,
    credit: account,
    tax_account: account,
    recognition: z.enum(["operating", "asset", "neutral"]).default("operating"),
    payment_status: z
      .enum(["unpaid", "scheduled", "paid", "disputed", "not_applicable"])
      .default("unpaid"),
    cost_center: z.string().trim().max(100).default("allgemein"),
    notes: z.string().trim().max(4000).default(""),
    account_ref: short,
    employee_ref: short,
    acquisition_cost: cents.nonnegative().default(0),
    residual_value: cents.nonnegative().default(0),
    life_months: z.number().int().min(1).max(1200).default(36),
    in_service: z.iso.date().nullable().default(null),
    linked_id: z.uuid().nullable().default(null),
    asset_ref: short,
    employer_cost: cents.nonnegative().default(0),
    net_wage: cents.nonnegative().default(0),
  })
  .strict();
export const financeRecordSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().nonnegative().optional(),
    brand: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/),
    kind: z.enum(["document", "bank", "asset", "depreciation", "payroll"]),
    data: financeDataSchema,
  })
  .strict();
export const financeImportSchema = z
  .object({
    schema_version: z.literal(1),
    source: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/),
    batch_id: z.string().min(8).max(100),
    mode: z.enum(["snapshot", "delta"]).default("delta"),
    generated_at: z.iso.datetime(),
    records: z
      .array(
        z.object({
          external_id: z.string().min(1).max(180),
          brand: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/),
          kind: z.enum([
            "document",
            "bank",
            "asset",
            "depreciation",
            "payroll",
          ]),
          state: z.enum(["draft", "posted", "reversed"]),
          revision: z.string().min(1).max(100),
          data: financeDataSchema,
          attachment: z
            .object({
              name: z.string().min(1).max(240),
              remote_id: z.string().min(1).max(180),
              mime: z.string().max(100),
              size: z.number().int().min(1).max(31457280),
            })
            .nullable()
            .optional(),
        }),
      )
      .max(500),
  })
  .strict();
export const allocationSchema = z
  .object({
    mode: z.enum(["none", "revenue", "fixed"]),
    weights: z.record(
      z.enum(["insolvenzhelden", "finanzhelden", "goldhelden", "posthelden"]),
      z.number().int().min(0).max(10000),
    ),
  })
  .refine(
    (a) =>
      a.mode !== "fixed" ||
      Object.values(a.weights).reduce((s, n) => s + n, 0) === 10000,
    { message: "Die Verteilung muss zusammen 100 % ergeben." },
  );
