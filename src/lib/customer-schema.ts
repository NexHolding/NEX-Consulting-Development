import { z } from "zod";
import { customerGroups } from "./customer-fields";
const fields: Record<string, z.ZodType<string | number | undefined>> = {};
for (const group of customerGroups)
  for (const field of group.fields) {
    fields[field.name] =
      field.type === "number"
        ? z.number().int().min(0).max(field.max).optional()
        : (field.type === "email"
            ? z
                .string()
                .trim()
                .max(field.max)
                .refine(
                  (value) => value === "" || z.email().safeParse(value).success,
                  "Bitte eine gültige E-Mail-Adresse angeben.",
                )
            : z.string().trim().max(field.max)
          ).optional();
  }
export const customerCreateSchema = z.object({
  ...fields,
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().max(1000).optional(),
  billing_address: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(4000).optional(),
});
export const customerUpdateSchema = customerCreateSchema
  .partial()
  .extend({ id: z.string().uuid() });
