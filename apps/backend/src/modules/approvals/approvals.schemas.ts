import { z } from 'zod';

export const approveTicketSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const rejectTicketSchema = z.object({
  reason: z
    .string()
    .min(20, 'O motivo da rejeição deve ter no mínimo 20 caracteres')
    .max(500),
});

export type ApproveTicketInput = z.infer<typeof approveTicketSchema>;
export type RejectTicketInput = z.infer<typeof rejectTicketSchema>;
