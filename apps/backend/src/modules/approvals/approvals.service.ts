import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/errors/AppError.js';
import { AuditService } from '../../shared/services/audit.service.js';
import { enqueueEmail } from '../notifications/email.service.js';
import { env } from '../../shared/config/env.js';
import { getTicketsAprovadosQueue } from '../integrations/casi/casi.worker.js';
import type { TicketDetailDto } from '@itsm/shared-types';
import type { ApproveTicketInput, RejectTicketInput } from './approvals.schemas.js';

const ticketDetailRelations = {
  catalog: { select: { slug: true, nome: true } },
  requester: { select: { nome: true } },
  approver: { select: { nome: true } },
  history: {
    orderBy: { createdAt: 'asc' as const },
    include: { actor: { select: { nome: true } } },
  },
} as const;

function toDetail(ticket: {
  id: string; numero: number; status: string; openedAt: Date; updatedAt: Date;
  requesterId: string; approverId: string | null;
  formData: unknown; approvalComment: string | null; rejectionReason: string | null;
  integrationLog: unknown; integrationAttempts: number;
  approvedAt: Date | null; completedAt: Date | null; rejectedAt: Date | null; cancelledAt: Date | null;
  catalog: { slug: string; nome: string };
  requester: { nome: string };
  approver: { nome: string } | null;
  history: Array<{ id: string; fromStatus: string | null; toStatus: string; comment: string | null; createdAt: Date; actor: { nome: string } | null }>;
}): TicketDetailDto {
  return {
    id: ticket.id,
    numero: ticket.numero,
    catalogSlug: ticket.catalog.slug,
    catalogNome: ticket.catalog.nome,
    status: ticket.status as TicketDetailDto['status'],
    requesterId: ticket.requesterId,
    approverId: ticket.approverId,
    requesterNome: ticket.requester.nome,
    approverNome: ticket.approver?.nome ?? null,
    openedAt: ticket.openedAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
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

export class ApprovalsService {
  private readonly audit: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.audit = new AuditService(prisma);
  }

  async approve(
    ticketId: string,
    input: ApproveTicketInput,
    actorUserId: string,
    actorIp?: string,
  ): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, nome: true, email: true } },
        approver: { select: { id: true, nome: true, email: true } },
        catalog: { select: { nome: true } },
      },
    });

    if (!ticket) throw new NotFoundError('Chamado', ticketId);
    if (ticket.approverId !== actorUserId) throw new ForbiddenError('Apenas o gestor aprovador pode aprovar este chamado');
    if (ticket.status !== 'AGUARDANDO_APROVACAO') {
      throw new ValidationError('Apenas chamados em "Aguardando Aprovação" podem ser aprovados.');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'APROVADO', approvedAt: new Date(), approvalComment: input.comment ?? null },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          fromStatus: 'AGUARDANDO_APROVACAO',
          toStatus: 'APROVADO',
          actorId: actorUserId,
          comment: input.comment ?? 'Chamado aprovado pelo gestor',
        },
      });
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticketId,
      action: 'APPROVE',
      actorUserId,
      actorIp,
      beforeValue: { status: 'AGUARDANDO_APROVACAO' },
      afterValue: { status: 'APROVADO' },
    });

    // Email: notify requester of approval
    await enqueueEmail({
      type: 'ticket_approved',
      ticketNumero: ticket.numero,
      ticketId,
      catalogNome: ticket.catalog.nome,
      requesterEmail: ticket.requester.email,
      requesterNome: ticket.requester.nome,
      approvalComment: input.comment ?? null,
      appBaseUrl: env.APP_BASE_URL,
    });

    await getTicketsAprovadosQueue().add('process', { ticketId }, { jobId: ticketId });

    const updated = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: ticketDetailRelations,
    });

    return toDetail(updated);
  }

  async reject(
    ticketId: string,
    input: RejectTicketInput,
    actorUserId: string,
    actorIp?: string,
  ): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, nome: true, email: true } },
        catalog: { select: { nome: true } },
      },
    });

    if (!ticket) throw new NotFoundError('Chamado', ticketId);
    if (ticket.approverId !== actorUserId) throw new ForbiddenError('Apenas o gestor aprovador pode rejeitar este chamado');
    if (ticket.status !== 'AGUARDANDO_APROVACAO') {
      throw new ValidationError('Apenas chamados em "Aguardando Aprovação" podem ser rejeitados.');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'REJEITADO', rejectedAt: new Date(), rejectionReason: input.reason },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          fromStatus: 'AGUARDANDO_APROVACAO',
          toStatus: 'REJEITADO',
          actorId: actorUserId,
          comment: input.reason,
        },
      });
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticketId,
      action: 'REJECT',
      actorUserId,
      actorIp,
      beforeValue: { status: 'AGUARDANDO_APROVACAO' },
      afterValue: { status: 'REJEITADO', rejectionReason: input.reason },
    });

    // Email: notify requester of rejection with reason
    await enqueueEmail({
      type: 'ticket_rejected',
      ticketNumero: ticket.numero,
      ticketId,
      catalogNome: ticket.catalog.nome,
      requesterEmail: ticket.requester.email,
      requesterNome: ticket.requester.nome,
      rejectionReason: input.reason,
      appBaseUrl: env.APP_BASE_URL,
    });

    const updated = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: ticketDetailRelations,
    });

    return toDetail(updated);
  }
}
