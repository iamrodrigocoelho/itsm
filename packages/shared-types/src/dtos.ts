import type { Role, TicketStatus, UserStatus } from './enums.js';

// Auth
export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserSummaryDto;
}

export interface RefreshRequestDto {
  refreshToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}

// User
export interface UserSummaryDto {
  id: string;
  matricula: string;
  nome: string;
  email: string;
  role: Role;
  status: UserStatus;
  codDominio: number;
  codEmpresa: number;
  codLojaAtual: number;
  mustChangePassword: boolean;
}

export interface UserDetailDto extends UserSummaryDto {
  cpf: string | null;
  telefone: string | null;
  managerId: string | null;
  managerNome: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserDto {
  matricula: string;
  nome: string;
  email: string;
  password: string;
  role: Role;
  codDominio: number;
  codEmpresa: number;
  codLojaAtual: number;
  cpf?: string | null;
  telefone?: string | null;
  managerId?: string | null;
}

export interface UpdateUserDto {
  nome?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  codDominio?: number;
  codEmpresa?: number;
  codLojaAtual?: number;
  cpf?: string | null;
  telefone?: string | null;
}

// Audit
export interface AuditLogDto {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  actorNome: string | null;
  actorIp: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  metadata: unknown;
  createdAt: string;
}

// CSV Import
export interface CsvImportJobDto {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errorReport: unknown;
  createdAt: string;
  finishedAt: string | null;
}

// Service Catalog
export interface ServiceCatalogDto {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  categoria: string | null;
  icone: string | null;
  ativo: boolean;
  formSchema: Record<string, unknown>;
  workflow: Record<string, unknown>;
  integration: string | null;
}

// Ticket
export interface CreateTicketDto {
  catalogSlug: string;
  formData: Record<string, unknown>;
}

export interface ListTicketsQueryDto {
  page?: number;
  limit?: number;
  status?: string | string[];
  catalogSlug?: string;
  requesterId?: string;
}

export interface TicketSummaryDto {
  id: string;
  numero: number;
  catalogSlug: string;
  catalogNome: string;
  status: TicketStatus;
  requesterNome: string;
  approverNome: string | null;
  openedAt: string;
  updatedAt: string;
}

export interface TicketDetailDto extends TicketSummaryDto {
  requesterId: string;
  approverId: string | null;
  formData: Record<string, unknown>;
  approvalComment: string | null;
  rejectionReason: string | null;
  integrationLog: unknown;
  integrationAttempts: number;
  approvedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  history: TicketHistoryDto[];
}

export interface TicketHistoryDto {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  actorNome: string | null;
  comment: string | null;
  createdAt: string;
}

// Dashboard / Reports
export interface DashboardStatsDto {
  totalTickets: number;
  pendingApproval: number;
  integrationFailures: number;
  avgApprovalTimeHours: number | null;
  avgCompletionTimeHours: number | null;
  approvalRate: number | null;
  byStatus: { status: string; count: number }[];
  byDay: { date: string; count: number }[];
  byOriginStore: { codLoja: number; count: number }[];
  byApprover: { approverNome: string; avgHours: number; count: number }[];
}

// Pagination
export interface PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API errors
export interface ApiErrorDto {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}
