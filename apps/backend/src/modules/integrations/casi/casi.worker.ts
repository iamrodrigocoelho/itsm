import { Worker, Queue, type Job } from 'bullmq';
import { PrismaClient, type Prisma } from '@prisma/client';
import { casiClient } from './casi.client.js';
import { enqueueEmail } from '../../notifications/email.service.js';
import { AuditService } from '../../../shared/services/audit.service.js';
import { getRedis } from '../../../shared/utils/redis.js';
import { logger } from '../../../shared/utils/logger.js';
import { env } from '../../../shared/config/env.js';

export const TICKETS_APROVADOS_QUEUE = 'tickets.aprovados';

// 4 tentativas totais: 1 inicial + 3 retries com backoff 10s / 30s / 90s
const MAX_ATTEMPTS = 4;
const BACKOFF_DELAYS_MS = [10_000, 30_000, 90_000];

export interface CasiJobData {
  ticketId: string;
}

let ticketsQueue: Queue<CasiJobData> | null = null;

/** Fila compartilhada por ApprovalsService e ReprocessService */
export function getTicketsAprovadosQueue(): Queue<CasiJobData> {
  if (!ticketsQueue) {
    ticketsQueue = new Queue<CasiJobData>(TICKETS_APROVADOS_QUEUE, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: { type: 'custom' },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return ticketsQueue;
}

const prisma = new PrismaClient();
const audit = new AuditService(prisma);

async function processarAlteracaoLoja(job: Job<CasiJobData>): Promise<void> {
  const { ticketId } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  logger.info({ ticketId, attempt: attemptNumber }, 'CASI worker: iniciando processamento');

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: true,
      approver: { select: { id: true, nome: true, email: true } },
      catalog: { select: { nome: true } },
    },
  });

  if (!ticket) {
    logger.error({ ticketId }, 'CASI worker: chamado não encontrado, descartando job');
    return;
  }

  if (['CONCLUIDO', 'CANCELADO', 'REJEITADO'].includes(ticket.status)) {
    logger.warn({ ticketId, status: ticket.status }, 'CASI worker: estado terminal, ignorando');
    return;
  }

  // Transição para EM_PROCESSAMENTO se ainda não estiver nesse estado
  if (ticket.status !== 'EM_PROCESSAMENTO') {
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'EM_PROCESSAMENTO' } });
    await prisma.ticketHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus: 'EM_PROCESSAMENTO',
        comment: `Tentativa ${attemptNumber} — processamento iniciado`,
      },
    });
  }

  const formData = ticket.formData as Record<string, unknown>;
  const codLojaNova = Number(formData.codLojaDestino ?? formData.codLoja);

  let usuarioCasi;
  let resultado;

  try {
    usuarioCasi = await casiClient.consultarUsuario(
      ticket.requester.codDominio,
      Number(ticket.requester.matricula),
    );

    resultado = await casiClient.alterarLojaDoUsuario({
      codDominio: ticket.requester.codDominio,
      numMatricula: Number(ticket.requester.matricula),
      nome: ticket.requester.nome,
      email: ticket.requester.email,
      codLojaNova,
      controleAcessoAtual: usuarioCasi.controleAcesso,
      autenticacaoLocal: usuarioCasi.autenticacaoLocal,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ ticketId, attempt: attemptNumber, err: errMsg }, 'CASI worker: erro na chamada CASI');
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        integrationAttempts: { increment: 1 },
        integrationLog: { error: errMsg, attempt: attemptNumber, ts: new Date().toISOString() },
      },
    });
    throw err; // BullMQ gerencia o retry com backoff
  }

  if (!resultado.sucesso) {
    const errMsg = `CASI: qtdeRegAlterados=${resultado.qtdeRegAlterados}`;
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        integrationAttempts: { increment: 1 },
        integrationLog: { error: errMsg, response: resultado.rawResponse, attempt: attemptNumber, ts: new Date().toISOString() },
      },
    });
    throw new Error(errMsg);
  }

  // Sucesso
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({ where: { id: ticket.requesterId }, data: { codLojaAtual: codLojaNova } });
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'CONCLUIDO',
        completedAt: new Date(),
        integrationAttempts: { increment: 1 },
        integrationLog: { success: true, response: resultado!.rawResponse, attempt: attemptNumber, ts: new Date().toISOString() },
      },
    });
    await tx.ticketHistory.create({
      data: {
        ticketId,
        fromStatus: 'EM_PROCESSAMENTO',
        toStatus: 'CONCLUIDO',
        comment: 'Alteração efetivada com sucesso na API CASI',
      },
    });
  });

  await audit.log({
    entityType: 'Ticket',
    entityId: ticketId,
    action: 'CASI_CALL',
    afterValue: { status: 'CONCLUIDO', codLojaNova, qtdeRegAlterados: resultado.qtdeRegAlterados },
  });

  logger.info({ ticketId, codLojaNova }, 'CASI worker: chamado concluído com sucesso');

  if (ticket.approver) {
    await enqueueEmail({
      type: 'ticket_completed',
      ticketNumero: ticket.numero,
      ticketId,
      catalogNome: ticket.catalog.nome,
      requesterEmail: ticket.requester.email,
      requesterNome: ticket.requester.nome,
      gestorEmail: ticket.approver.email,
      gestorNome: ticket.approver.nome,
      appBaseUrl: env.APP_BASE_URL,
    });
  }
}

async function marcarFalhaIntegracao(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, nome: true, email: true } },
      catalog: { select: { nome: true } },
    },
  });
  if (!ticket || ticket.status === 'CONCLUIDO') return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.ticket.update({ where: { id: ticketId }, data: { status: 'FALHA_INTEGRACAO' } });
    await tx.ticketHistory.create({
      data: {
        ticketId,
        fromStatus: 'EM_PROCESSAMENTO',
        toStatus: 'FALHA_INTEGRACAO',
        comment: 'Todas as tentativas de integração esgotadas',
      },
    });
  });

  await audit.log({
    entityType: 'Ticket',
    entityId: ticketId,
    action: 'CASI_CALL',
    afterValue: { status: 'FALHA_INTEGRACAO' },
  });

  const analistas = await prisma.user.findMany({
    where: { role: 'ANALISTA_TI', status: 'ATIVO' },
    select: { email: true },
  });

  await enqueueEmail({
    type: 'ticket_failed',
    ticketNumero: ticket.numero,
    ticketId,
    catalogNome: ticket.catalog.nome,
    requesterEmail: ticket.requester.email,
    requesterNome: ticket.requester.nome,
    analystEmails: analistas.map((a: { email: string }) => a.email),
    appBaseUrl: env.APP_BASE_URL,
  });

  logger.warn({ ticketId }, 'CASI worker: FALHA_INTEGRACAO, analistas notificados');
}

export function startCasiWorker(): Worker<CasiJobData> {
  const worker = new Worker<CasiJobData>(TICKETS_APROVADOS_QUEUE, processarAlteracaoLoja, {
    connection: getRedis(),
    concurrency: 5,
    settings: {
      backoffStrategy: (attemptsMade: number) =>
        BACKOFF_DELAYS_MS[Math.min(attemptsMade - 1, BACKOFF_DELAYS_MS.length - 1)] ?? 90_000,
    },
  });

  worker.on('completed', (job) =>
    logger.info({ jobId: job.id, ticketId: job.data.ticketId }, 'CASI worker: job concluído'),
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const isExhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    logger.error(
      { jobId: job.id, ticketId: job.data.ticketId, attempt: job.attemptsMade, isExhausted, err: err.message },
      'CASI worker: job falhou',
    );
    if (isExhausted) {
      await marcarFalhaIntegracao(job.data.ticketId).catch((e) =>
        logger.error({ err: e }, 'CASI worker: erro ao marcar FALHA_INTEGRACAO'),
      );
    }
  });

  worker.on('error', (err) => logger.error({ err }, 'CASI worker: erro interno'));

  logger.info('CASI worker registrado na fila tickets.aprovados');
  return worker;
}
