import { z } from 'zod';

export const createTicketSchema = z.object({
  catalogSlug: z.string().min(1),
  formData: z.record(z.unknown()),
});

export const listTicketsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().optional(),
  catalogSlug: z.string().optional(),
  requesterId: z.string().uuid().optional(),
  approverId: z.string().uuid().optional(),
  numero: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  openedAtFrom: z.string().datetime({ offset: true }).optional(),
  openedAtTo: z.string().datetime({ offset: true }).optional(),
  completedAtFrom: z.string().datetime({ offset: true }).optional(),
  completedAtTo: z.string().datetime({ offset: true }).optional(),
});

export const cancelTicketSchema = z.object({
  comment: z.string().max(500).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ListTicketsInput = z.infer<typeof listTicketsSchema>;
export type CancelTicketInput = z.infer<typeof cancelTicketSchema>;
