import { z } from "zod";
export const timeEditSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().nonnegative(),
    project_id: z.uuid(),
    kind: z.enum(["internal", "external"]),
    category: z.enum(["active", "processing", "waiting", "break"]),
    description: z.string().trim().min(3).max(1000),
    started_at: z.iso.datetime({ offset: true }),
    stopped_at: z.iso.datetime({ offset: true }),
    reason: z.string().trim().min(3).max(1000),
  })
  .refine(
    (p) => {
      const start = Date.parse(p.started_at),
        stop = Date.parse(p.stopped_at);
      return stop > start && stop <= Date.now() && stop - start <= 86400000;
    },
    {
      message:
        "Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.",
    },
  );
