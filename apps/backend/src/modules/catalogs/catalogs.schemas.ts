import { z } from 'zod';

export const listCatalogsSchema = z.object({
  ativo: z
    .string()
    .optional()
    .transform((v) => (v === 'false' ? false : v === 'true' ? true : undefined)),
});

export type ListCatalogsInput = z.infer<typeof listCatalogsSchema>;
