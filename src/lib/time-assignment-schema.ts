import { z } from "zod";
import { validTimeAssignment } from "./correction-rounds";
export const timeAssignmentSchema = z
  .object({
    correction_round: z.number().int().min(1).max(999).nullable().default(null),
    change_round: z.number().int().min(1).max(999).nullable().default(null),
    extra_work: z.string().trim().min(3).max(2000).nullable().default(null),
    change_request: z.string().trim().min(3).max(2000).nullable().default(null),
  })
  .refine(validTimeAssignment, {
    message:
      "Abänderung und Korrekturrunde können nicht gleichzeitig zugeordnet werden.",
  });
