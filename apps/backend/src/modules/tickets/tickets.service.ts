import type { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors/AppError.js';
import { AuditService } from '../../shared/services/audit.service.js';
import { enqueueEmail } from '../notifications/email.service.js';
import { env } from '../../shared/config/env.js';
import type { TicketSummaryDto, TicketDetailDto, PaginatedResponseDto } from '@itsm/shared-types';
import type { CreateTicketInput, ListTicketsInput, CancelTicketInput } from './tickets.schemas.js';

function toSummary(ticket: {
  id: string;
  numero: number;
  status: string;
  openedAt: Date;
  updatedAt: Date;
  catalog: { slug: string; nome: string };
  requester: { nome: string };
  approver: { nome: string } | null;
}): TicketSummaryDto {
  return {
    id: ticket.id,
    numero: ticket.numero,
    catalogSlug: ticket.catalog.slug,
    catalogNome: ticket.catalog.nome,
    status: ticket.status as TicketSummaryDto['status'],
    requesterNome: ticket.requester.nome,
    approverNome: ticket.approver?.nome ?? null,
    openedAt: ticket.openedAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function toDetail(ticket: {
  id: string;
  numero: number;
  status: string;
  openedAt: Date;
  updatedAt: Date;
  requesterId: string;
  approverId: string | null;
  formData: unknown;
  approvalComment: string | null;
  rejectionReason: string | null;
  integrationLog: unknown;
  integrationAttempts: number;
  approvedAt: Date | null;
  completedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  catalog: { slug: string; nome: string };
  requester: { nome: string };
  approver: { nome: string } | null;
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    comment: string | null;
    createdAt: Date;
    actor: { nome: string } | null;
  }>;
}): TicketDetailDto {
  return {
    ...toSummary(ticket),
    requesterId: ticket.requesterId,
    approverId: ticket.approverId,
    formData: ticket.formData as Record<string, unknown>,
    approvalComment: ticket.approvalComment,
    rejectionReason: ticket.rejectionReason,
    integrationLog: ticket.integrationLog,
    integrationAttempts: ticket.integrationAttempts,
    approvedAt: ticket.approvedAt?.toISOString() ?? null,
    completedAt: ticket.completedAt?.toISOString() ?? null,
    rejectedAt: ticket.rejectedAt?.toISOString() ?? null,
    cancelledAt: ticket.cancelledAt?.toISOString() ?? null,
    history: ticket.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus as TicketDetailDto['history'][number]['fromStatus'],
      toStatus: h.toStatus as TicketDetailDto['history'][number]['toStatus'],
      actorNome: h.actor?.nome ?? null,
      comment: h.comment,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

const ticketWithRelations = {
  catalog: { select: { slug: true, nome: true } },
  requester: { select: { nome: true } },
  approver: { select: { nome: true } },
} as const;

const ticketDetailRelations = {
  ...ticketWithRelations,
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: { actor: { select: { nome: true } } },
  },
} as const;

export class TicketsService {
  private readonly audit: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.audit = new AuditService(prisma);
  }

  async create(
    input: CreateTicketInput,
    actorUserId: string,
    actorIp?: string,
  ): Promise<TicketDetailDto> {
    const catalog = await this.prisma.serviceCatalog.findUnique({
      where: { slug: input.catalogSlug },
    });
    if (!catalog || !catalog.ativo) {
      throw new NotFoundError('Catálogo de serviço', input.catalogSlug);
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, managerId: true, codLojaAtual: true, nome: true, email: true },
    });
    if (!requester) throw new NotFoundError('Usuário', actorUserId);

    if (!requester.managerId) {
      throw new ValidationError(
        'Você não possui gestor cadastrado. Contate o administrador para configurar sua hierarquia antes de abrir chamados.',
      );
    }

    // For "alteracao-loja" catalog: validate nova loja != loja atual
    if (catalog.slug === 'alteracao-loja') {
      const novaLoja = input.formData['novaLoja'];
      if (novaLoja !== undefined && Number(novaLoja) === requester.codLojaAtual) {
        throw new ValidationError('A nova loja deve ser diferente da loja atual.');
      }
    }

    const ticket = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.ticket.create({
        data: {
          catalogId: catalog.id,
          requesterId: actorUserId,
          approverId: requester.managerId,
          status: 'AGUARDANDO_APROVACAO',
          formData: input.formData as never,
        },
        include: ticketDetailRelations,
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: created.id,
          fromStatus: null,
          toStatus: 'AGUARDANDO_APROVACAO',
          actorId: actorUserId,
          comment: 'Chamado aberto pelo solicitante',
        },
      });

      return created;
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'CREATE',
      actorUserId,
      actorIp,
      afterValue: { numero: ticket.numero, catalogSlug: catalog.slug, status: ticket.status },
    });

    const full = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: ticketDetailRelations,
    });

    // Email: notify requester (confirmation) + gestor (action pending)
    const manager = await this.prisma.user.findUnique({
      where: { id: requester.managerId },
      select: { nome: true, email: true },
    });
    if (manager) {
      await enqueueEmail({
        type: 'ticket_opened',
        ticketNumero: full.numero,
        ticketId: full.id,
        catalogNome: catalog.nome,
        requesterEmail: requester.email,
        requesterNome: requester.nome,
        gestorEmail: manager.email,
        gestorNome: manager.nome,
        appBaseUrl: env.APP_BASE_URL,
      });
    }

    return toDetail(full);
  }

  private async buildListWhere(
    input: ListTicketsInput,
    actorUserId: string,
    actorRole: string,
  ) {
    const { status, catalogSlug, requesterId, approverId, numero, openedAtFrom, openedAtTo, completedAtFrom, completedAtTo } = input;

    const statusFilter = status
      ? { status: { in: status.split(',').map((s) => s.trim()) as never[] } }
      : {};

    let catalogFilter = {};
    if (catalogSlug) {
      const catalog = await this.prisma.serviceCatalog.findUnique({
        where: { slug: catalogSlug },
        select: { id: true },
      });
      if (catalog) catalogFilter = { catalogId: catalog.id };
    }

    let scopeFilter = {};
    if (actorRole === 'COLABORADOR') {
      scopeFilter = { requesterId: actorUserId };
    } else if (actorRole === 'GESTOR') {
      scopeFilter = {
        OR: [
          { requesterId: actorUserId },
          { approverId: actorUserId },
        ],
      };
    } else {
      const extra: Record<string, unknown> = {};
      if (requesterId) extra['requesterId'] = requesterId;
      if (approverId) extra['approverId'] = approverId;
      scopeFilter = extra;
    }

    const dateFilter: Record<string, unknown> = {};
    if (openedAtFrom || openedAtTo) {
      dateFilter['openedAt'] = {
        ...(openedAtFrom ? { gte: new Date(openedAtFrom) } : {}),
        ...(openedAtTo ? { lte: new Date(openedAtTo) } : {}),
      };
    }
    if (completedAtFrom || completedAtTo) {
      dateFilter['completedAt'] = {
        ...(completedAtFrom ? { gte: new Date(completedAtFrom) } : {}),
        ...(completedAtTo ? { lte: new Date(completedAtTo) } : {}),
      };
    }

    const numeroFilter = numero ? { numero } : {};

    return { ...statusFilter, ...catalogFilter, ...scopeFilter, ...dateFilter, ...numeroFilter };
  }

  async list(
    input: ListTicketsInput,
    actorUserId: string,
    actorRole: string,
  ): Promise<PaginatedResponseDto<TicketSummaryDto>> {
    const { page, limit } = input;
    const skip = (page - 1) * limit;
    const where = await this.buildListWhere(input, actorUserId, actorRole);

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: ticketWithRelations,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: data.map(toSummary),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportCsv(
    input: ListTicketsInput,
    actorUserId: string,
    actorRole: string,
  ): Promise<string> {
    const where = await this.buildListWhere(input, actorUserId, actorRole);

    const tickets = await this.prisma.ticket.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: 10000,
      include: {
        catalog: { select: { nome: true } },
        requester: { select: { nome: true, matricula: true } },
        approver: { select: { nome: true } },
      },
    });

    const STATUS_LABELS: Record<string, string> = {
      RASCUNHO: 'Rascunho',
      AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
      APROVADO: 'Aprovado',
      EM_PROCESSAMENTO: 'Em Processamento',
      CONCLUIDO: 'Concluído',
      REJEITADO: 'Rejeitado',
      CANCELADO: 'Cancelado',
      FALHA_INTEGRACAO: 'Falha de Integração',
    };

    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = ['Número', 'Catálogo', 'Status', 'Solicitante', 'Matrícula', 'Aprovador', 'Aberto em', 'Atualizado em', 'Concluído em'];
    const rows = tickets.map((t) => [
      t.numero,
      t.catalog.nome,
      STATUS_LABELS[t.status] ?? t.status,
      t.requester.nome,
      t.requester.matricula,
      t.approver?.nome ?? '',
      t.openedAt.toISOString(),
      t.updatedAt.toISOString(),
      t.completedAt?.toISOString() ?? '',
    ].map(escape).join(','));

    return [header.join(','), ...rows].join('\n');
  }

  async getById(id: string, actorUserId: string, actorRole: string): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketDetailRelations,
    });

    if (!ticket) throw new NotFoundError('Chamado', id);

    // Access control
    if (actorRole === 'COLABORADOR' && ticket.requesterId !== actorUserId) {
      throw new ForbiddenError('Acesso negado');
    }
    if (
      actorRole === 'GESTOR' &&
      ticket.requesterId !== actorUserId &&
      ticket.approverId !== actorUserId
    ) {
      throw new ForbiddenError('Acesso negado');
    }

    return toDetail(ticket);
  }

  async cancel(
    id: string,
    input: CancelTicketInput,
    actorUserId: string,
    actorIp?: string,
  ): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { nome: true } },
        approver: { select: { nome: true, email: true } },
        catalog: { select: { nome: true } },
      },
    });
    if (!ticket) throw new NotFoundError('Chamado', id);

    if (ticket.requesterId !== actorUserId) {
      throw new ForbiddenError('Apenas o solicitante pode cancelar o chamado');
    }

    if (ticket.status !== 'AGUARDANDO_APROVACAO') {
      throw new ValidationError(
        'Apenas chamados em status "Aguardando Aprovação" podem ser cancelados.',
      );
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.ticket.update({
        where: { id },
        data: { status: 'CANCELADO', cancelledAt: new Date() },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          fromStatus: 'AGUARDANDO_APROVACAO',
          toStatus: 'CANCELADO',
          actorId: actorUserId,
          comment: input.comment ?? 'Cancelado pelo solicitante',
        },
      });
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: id,
      action: 'CANCEL',
      actorUserId,
      actorIp,
      beforeValue: { status: ticket.status },
      afterValue: { status: 'CANCELADO' },
    });

    const updated = await this.prisma.ticket.findUniqueOrThrow({
      where: { id },
      include: ticketDetailRelations,
    });

    // Email: notify gestor that ticket was cancelled
    if (ticket.approver) {
      await enqueueEmail({
        type: 'ticket_cancelled',
        ticketNumero: ticket.numero,
        ticketId: id,
        catalogNome: ticket.catalog.nome,
        gestorEmail: ticket.approver.email,
        gestorNome: ticket.approver.nome,
        requesterNome: ticket.requester.nome,
        appBaseUrl: env.APP_BASE_URL,
      });
    }

    return toDetail(updated);
  }
}
