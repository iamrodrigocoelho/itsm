import { z } from 'zod';

export const createUserSchema = z.object({
  matricula: z.string().min(1).max(20),
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Deve conter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número')
    .regex(/[^A-Za-z0-9]/, 'Deve conter ao menos um caractere especial'),
  role: z.enum(['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN']).default('COLABORADOR'),
  codDominio: z.number().int().positive(),
  codEmpresa: z.number().int().positive(),
  codLojaAtual: z.number().int().positive(),
  cpf: z.string().max(14).nullable().optional(),
  telefone: z.string().max(20).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN']).optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
  codDominio: z.number().int().positive().optional(),
  codEmpresa: z.number().int().positive().optional(),
  codLojaAtual: z.number().int().positive().optional(),
  cpf: z.string().max(14).nullable().optional(),
  telefone: z.string().max(20).nullable().optional(),
});

export const setManagerSchema = z.object({
  managerId: z.string().uuid(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN']).optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

export const importCsvSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1).max(2 * 1024 * 1024), // 2MB max as raw text
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SetManagerInput = z.infer<typeof setManagerSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type ImportCsvInput = z.infer<typeof importCsvSchema>;
