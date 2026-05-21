import nodemailer from 'nodemailer';
import { Queue, Worker } from 'bullmq';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { getRedis } from '../../shared/utils/redis.js';

export type EmailEvent =
  | { type: 'ticket_opened'; ticketNumero: number; ticketId: string; catalogNome: string; requesterEmail: string; requesterNome: string; gestorEmail: string; gestorNome: string; appBaseUrl: string }
  | { type: 'ticket_approved'; ticketNumero: number; ticketId: string; catalogNome: string; requesterEmail: string; requesterNome: string; approvalComment: string | null; appBaseUrl: string }
  | { type: 'ticket_rejected'; ticketNumero: number; ticketId: string; catalogNome: string; requesterEmail: string; requesterNome: string; rejectionReason: string; appBaseUrl: string }
  | { type: 'ticket_cancelled'; ticketNumero: number; ticketId: string; catalogNome: string; gestorEmail: string; gestorNome: string; requesterNome: string; appBaseUrl: string }
  | { type: 'ticket_completed'; ticketNumero: number; ticketId: string; catalogNome: string; requesterEmail: string; requesterNome: string; gestorEmail: string; gestorNome: string; appBaseUrl: string }
  | { type: 'ticket_failed'; ticketNumero: number; ticketId: string; catalogNome: string; requesterEmail: string; requesterNome: string; analystEmails: string[]; appBaseUrl: string };

const QUEUE_NAME = 'email';

let emailQueue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return emailQueue;
}

export async function enqueueEmail(event: EmailEvent): Promise<void> {
  if (!env.SMTP_HOST) {
    logger.warn({ event: event.type }, 'SMTP not configured, skipping email');
    return;
  }
  await getEmailQueue().add(event.type, event);
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_TLS,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
}

const TICKET_LINK = (base: string, id: string) => `${base}/tickets/${id}`;

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F5F0EB;font-family:Inter,ui-sans-serif,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0EB;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E2DA">
        <tr>
          <td style="background-color:#1A1A1A;padding:20px 32px">
            <span style="color:#FFFFFF;font-size:16px;font-weight:600;letter-spacing:0.02em">ITSM — Conexão Tech</span>
          </td>
        </tr>
        <tr><td style="padding:32px">${body}</td></tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E8E2DA;background-color:#FAF7F4">
            <p style="margin:0;color:#9B8F83;font-size:12px">Esta mensagem foi gerada automaticamente pelo sistema ITSM. Não responda a este e-mail.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const p = (text: string, color = '#1A1A1A') =>
  `<p style="margin:0 0 12px;color:${color};font-size:15px;line-height:1.6">${text}</p>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 20px;background-color:#1A1A1A;color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">${label}</a>`;

function renderEmail(event: EmailEvent): { subject: string; html: string; to: string[] } {
  switch (event.type) {
    case 'ticket_opened': {
      const link = TICKET_LINK(event.appBaseUrl, event.ticketId);
      return {
        to: [event.requesterEmail, event.gestorEmail],
        subject: `[ITSM #${event.ticketNumero}] Novo chamado aguardando aprovação — ${event.catalogNome}`,
        html: wrapHtml(
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1A1A1A">Novo chamado aberto</h2>
           ${p(`Olá, <strong>${event.requesterNome}</strong> abriu um chamado de <strong>${event.catalogNome}</strong> que aguarda sua aprovação.`)}
           ${p(`<strong>Número do chamado:</strong> #${event.ticketNumero}`, '#5C5149')}
           ${p(`<strong>Gestor responsável:</strong> ${event.gestorNome}`, '#5C5149')}
           ${btn(link, 'Ver chamado')}`,
        ),
      };
    }
    case 'ticket_approved': {
      const link = TICKET_LINK(event.appBaseUrl, event.ticketId);
      const commentHtml = event.approvalComment
        ? p(`<strong>Comentário do gestor:</strong> ${event.approvalComment}`, '#5C5149')
        : '';
      return {
        to: [event.requesterEmail],
        subject: `[ITSM #${event.ticketNumero}] Chamado aprovado — ${event.catalogNome}`,
        html: wrapHtml(
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1A1A1A">Chamado aprovado ✓</h2>
           ${p(`Olá, <strong>${event.requesterNome}</strong>! Seu chamado <strong>#${event.ticketNumero}</strong> de <strong>${event.catalogNome}</strong> foi <strong>aprovado</strong> e será processado em breve.`)}
           ${commentHtml}
           ${btn(link, 'Ver chamado')}`,
        ),
      };
    }
    case 'ticket_rejected': {
      const link = TICKET_LINK(event.appBaseUrl, event.ticketId);
      return {
        to: [event.requesterEmail],
        subject: `[ITSM #${event.ticketNumero}] Chamado rejeitado — ${event.catalogNome}`,
        html: wrapHtml(
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1A1A1A">Chamado rejeitado</h2>
           ${p(`Olá, <strong>${event.requesterNome}</strong>. Infelizmente seu chamado <strong>#${event.ticketNumero}</strong> de <strong>${event.catalogNome}</strong> foi <strong>rejeitado</strong>.`)}
           ${p(`<strong>Motivo:</strong> ${event.rejectionReason}`, '#5C5149')}
           ${p('Caso tenha dúvidas, entre em contato com seu gestor ou com o suporte de TI.', '#9B8F83')}
           ${btn(link, 'Ver chamado')}`,
        ),
      };
    }
    case 'ticket_cancelled': {
      const link = TICKET_LINK(event.appBaseUrl, event.ticketId);
      return {
        to: [event.gestorEmail],
        subject: `[ITSM #${event.ticketNumero}] Chamado cancelado — ${event.catalogNome}`,
        html: wrapHtml(
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1A1A1A">Chamado cancelado</h2>
           ${p(`O chamado <strong>#${event.ticketNumero}</strong> de <strong>${event.catalogNome}</strong> aberto por <strong>${event.requesterNome}</strong> foi cancelado pelo solicitante.`)}
           ${btn(link, 'Ver chamado')}`,
        ),
      };
    }
    case 'ticket_completed': {
      const link = TICKET_LINK(event.appBaseUrl, event.ticketId);
      return {
        to: [event.requesterEmail, event.gestorEmail],
        subject: `[ITSM #${event.ticketNumero}] Chamado concluído — ${event.catalogNome}`,
        html: wrapHtml(
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1A1A1A">Chamado concluído ✓</h2>
           ${p(`O chamado <strong>#${event.ticketNumero}</strong> de <strong>${event.catalogNome}</strong> foi <strong>concluído com sucesso</strong>. A alteração foi efetivada no sistema CASI.`)}
           ${btn(link, 'Ver chamado')}`,
        ),
      };
    }
    case 'ticket_failed': {
      const link = TICKET_LINK(event.appBaseUrl, event.ticketId);
      return {
        to: [event.requesterEmail, ...event.analystEmails],
        subject: `[ITSM #${event.ticketNumero}] Falha de integração — ${event.catalogNome}`,
        html: wrapHtml(
          `<h2 style="margin:0 0 16px;font-size:20px;color:#1A1A1A">Falha de integração ⚠</h2>
           ${p(`Ocorreu uma falha ao processar o chamado <strong>#${event.ticketNumero}</strong> de <strong>${event.catalogNome}</strong>. A equipe de TI foi notificada e realizará o reprocessamento.`)}
           ${p('Por favor, aguarde enquanto investigamos o problema.', '#9B8F83')}
           ${btn(link, 'Ver chamado')}`,
        ),
      };
    }
  }
}

export function startEmailWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const event = job.data as EmailEvent;
      const { to, subject, html } = renderEmail(event);

      const transporter = buildTransporter();
      await transporter.sendMail({ from: env.SMTP_FROM, to: [...new Set(to)], subject, html });

      logger.info({ jobId: job.id, event: event.type, to }, 'Email sent');
    },
    { connection: getRedis(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed');
  });

  return worker;
}
