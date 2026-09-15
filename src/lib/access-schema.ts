import { z } from "zod";
import { twoFactorOptions, approvalOptions } from "./access-catalog";
const optionalText = (max: number) => z.string().trim().max(max).default("");
const email = z.union([z.email().max(200), z.literal("")]).default("");
export const accessSchema = z.object({
  service: z.string().trim().min(2).max(120),
  label: optionalText(160),
  login_url: optionalText(500).refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }),
  username: z.string().trim().min(1).max(320),
  two_factor: z.enum(twoFactorOptions).default("Unbekannt"),
  approval: z.enum(approvalOptions).default("Unbekannt"),
  notes: optionalText(2000),
});
export const infrastructureSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(253)
    .regex(/^(?!.*\s)(?!.*[/:@?#]).+\..+$/),
  registrar: optionalText(120),
  dns_provider: optionalText(120),
  hosting_provider: optionalText(120),
  email_provider: optionalText(120),
  sending_provider: optionalText(120),
  from_name: optionalText(160),
  from_email: email,
  reply_to_email: email,
  smtp_host: optionalText(253),
  smtp_port: z.number().int().min(1).max(65535).nullable().default(null),
  smtp_security: z
    .enum(["Unbekannt", "STARTTLS", "TLS", "Keine"])
    .default("Unbekannt"),
  credential_id: z.string().uuid().nullable().default(null),
  notes: optionalText(2000),
});
