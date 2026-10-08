import { z } from "zod";
import type { OfferQuote } from "./offer-catalog";

export type BillingProduct = {
  id: string;
  name: string;
  factor: number;
  active: boolean;
};
export type RecurringCost = {
  id: string;
  customer_id: string;
  project_id: string | null;
  product_id: string;
  label: string;
  cost_cents: number;
  factor: number;
  monthly_cents: number;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
};
export type CareSubscription = {
  offer_snapshot?: OfferQuote | null;
  id: string;
  project_id: string;
  plan: string;
  monthly_cents: number;
  included_minutes: number;
  included_requests?: number | null;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
};
export type BillingData = {
  billingAvailable?: boolean;
  billing_products: BillingProduct[];
  recurring_costs: RecurringCost[];
  subscriptions: CareSubscription[];
};
export type BillingMutation = (
  action: string,
  payload: Record<string, unknown>,
) => Promise<boolean>;
export const factorSchema = z
  .number()
  .min(1)
  .max(100)
  .refine((v) => Math.abs(v * 10000 - Math.round(v * 10000)) < 0.000001);
export const billingProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  factor: factorSchema.default(1.3),
  active: z.boolean().default(true),
});
const dates = {
  starts_on: z.iso.date().refine((v) => v >= "2020-01-01" && v <= "2100-12-31"),
  ends_on: z.iso.date().nullable().default(null),
};
export const recurringCostSchema = z
  .object({
    id: z.string().uuid().optional(),
    customer_id: z.string().uuid(),
    project_id: z.string().uuid().nullable().default(null),
    product_id: z.string().uuid(),
    label: z.string().trim().min(2).max(200),
    cost_cents: z.number().int().min(1).max(1000000000),
    factor: factorSchema,
    ...dates,
    active: z.boolean().default(true),
  })
  .refine((v) => !v.ends_on || v.ends_on >= v.starts_on, {
    message: "Ende muss nach Beginn liegen.",
  });
export const subscriptionSchema = z
  .object({
    project_id: z.string().uuid(),
    mode: z.enum(["individual", "package", "project"]).default("project"),
    package: z.enum(["Basic", "Business", "Enterprise"]).optional(),
    plan: z.string().trim().min(2).max(160).optional(),
    monthly_cents: z.number().int().min(1).max(1000000000).optional(),
    included_minutes: z.number().int().min(0).max(100000).default(0),
    included_requests: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .nullable()
      .default(null),
    ...dates,
  })
  .refine((v) => !v.ends_on || v.ends_on >= v.starts_on)
  .refine((v) => v.mode !== "individual" || (v.plan && v.monthly_cents))
  .refine((v) => v.mode !== "package" || v.package);
export function monthlyCharge(cost: number, factor: number) {
  return Math.floor((cost * Math.round(factor * 10000) + 5000) / 10000);
}
export function billingStatus(
  row: { starts_on: string; ends_on: string | null; active: boolean },
  today: string,
) {
  return !row.active
    ? "Pausiert"
    : row.starts_on > today
      ? "Geplant"
      : row.ends_on && row.ends_on < today
        ? "Beendet"
        : "Laufend";
}
