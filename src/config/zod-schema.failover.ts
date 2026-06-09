import { z } from "zod";

export const FailoverSchema = z
  .object({
    formatClass: z
      .object({
        crossProvider: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .optional();
