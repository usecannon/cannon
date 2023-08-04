import { z } from 'zod';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

export const runSchema = z
  .object({
    exec: z.string(),
    func: z.string(),
    modified: z.array(z.string()).nonempty(),
  })
  .merge(
    z
      .object({
        args: z.array(z.string()),
        env: z.array(z.string()),
        depends: z.array(z.string()),
      })
      .partial()
  );
