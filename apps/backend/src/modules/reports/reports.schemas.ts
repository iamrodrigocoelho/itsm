import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  periodDays: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30))
    .pipe(z.number().int().min(1).max(365)),
  catalogSlug: z.string().optional(),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
