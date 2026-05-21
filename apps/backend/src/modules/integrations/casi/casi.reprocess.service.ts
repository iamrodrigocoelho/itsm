import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { AuditService } from '../../../shared/services/audit.service.js';
import { getTicketsAprovadosQueue } from './casi.worker.js';
import type { TicketDetailDto } from '@itsm/shared-types';

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

export class ReprocessService {
  private readonly audit: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.audit = new AuditService(prisma);
  }

  async reprocess(ticketId: string, actorUserId: string, actorIp?: string): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) throw new NotFoundError('Chamado', ticketId);
    if (ticket.status !== 'FALHA_INTEGRACAO') {
      throw new ValidationError(
        `Apenas chamados com status FALHA_INTEGRACAO podem ser reprocessados. Status atual: ${ticket.status}`,
      );
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'APROVADO', integrationAttempts: 0 },
      });
      await tx.ticketHistory.create({
        data: {
          ticketId,
          fromStatus: 'FALHA_INTEGRACAO',
          toStatus: 'APROVADO',
          actorId: actorUserId,
          comment: 'Reprocessamento manual solicitado',
        },
      });
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticketId,
      action: 'REPROCESS',
      actorUserId,
      actorIp,
      beforeValue: { status: 'FALHA_INTEGRACAO' },
      afterValue: { status: 'APROVADO' },
    });

    // Reenfileira com nova jobId única para não colidir com o job anterior
    await getTicketsAprovadosQueue().add('process', { ticketId }, {
      jobId: `${ticketId}-reprocess-${Date.now()}`,
    });

    const updated = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: ticketDetailRelations,
    });

    return toDetail(updated);
  }
}
