import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { ticketsApi } from '@/lib/api';
import { TicketStatus, Role } from '@itsm/shared-types';
import type { TicketDetailDto, UserSummaryDto } from '@itsm/shared-types';
import { StatusChip } from './TicketsPage';
import { formatDate } from '@/lib/utils';

interface Props {
  user: UserSummaryDto;
}

const FIELD_LABELS: Record<string, string> = {
  solicitante: 'Solicitante',
  lojaAtual: 'Loja atual',
  novaLoja: 'Nova loja desejada',
  justificativa: 'Justificativa',
  dataEfetivacao: 'Data desejada para efetivação',
};

function FormDataDisplay({ formData }: { formData: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-spacing-lg gap-y-spacing-sm">
      {Object.entries(formData).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted uppercase tracking-wide">
            {FIELD_LABELS[key] ?? key}
          </dt>
          <dd className="text-body-sm text-ink break-words">
            {value === null || value === undefined || value === ''
              ? <span className="text-ink-subtle italic">—</span>
              : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function HistoryTimeline({ ticket }: { ticket: TicketDetailDto }) {
  return (
    <div className="flex flex-col gap-spacing-sm">
      {ticket.history.map((event, idx) => (
        <div key={event.id} className="flex gap-spacing-sm">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-ink-muted mt-1.5 shrink-0" />
            {idx < ticket.history.length - 1 && (
              <div className="w-px flex-1 bg-hairline-soft mt-1" />
            )}
          </div>
          <div className="pb-spacing-md flex-1 min-w-0">
            <div className="flex items-center gap-spacing-sm flex-wrap">
              <StatusChip status={event.toStatus} />
              <span className="text-caption text-ink-muted">{formatDate(event.createdAt)}</span>
              {event.actorNome && (
                <span className="text-caption text-ink-muted">por {event.actorNome}</span>
              )}
            </div>
            {event.comment && (
              <p className="text-body-sm text-ink-muted mt-1">{event.comment}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CancelModal({
  ticketId,
  onClose,
  onCancelled,
}: {
  ticketId: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [comment, setComment] = useState('');
  const mutation = useMutation({
    mutationFn: () => ticketsApi.cancel(ticketId, comment || undefined),
    onSuccess: onCancelled,
  });

  return (
    <div className="fixed inset-0 bg-ink/30 flex items-center justify-center z-50 p-spacing-md">
      <div className="bg-surface-1 rounded-xl border border-hairline p-spacing-lg w-full max-w-md flex flex-col gap-spacing-md">
        <div className="flex items-start gap-spacing-sm">
          <AlertTriangle size={20} className="text-semantic-error shrink-0 mt-0.5" />
          <div>
            <h2 className="text-subhead font-semibold text-ink">Cancelar chamado</h2>
            <p className="text-body-sm text-ink-muted mt-1">
              Tem certeza que deseja cancelar este chamado? Essa ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-body-sm font-medium text-ink">
            Motivo (opcional)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Descreva o motivo do cancelamento…"
            className="text-input w-full resize-none"
          />
        </div>

        {mutation.isError && (
          <p className="text-caption text-semantic-error">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Erro ao cancelar chamado.'}
          </p>
        )}

        <div className="flex gap-spacing-sm justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Voltar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-secondary flex items-center gap-2 text-semantic-error border-semantic-error/30 hover:bg-semantic-error/5"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </div>
  );
}

function ApproveModal({
  ticketId,
  onClose,
  onApproved,
}: {
  ticketId: string;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [comment, setComment] = useState('');
  const mutation = useMutation({
    mutationFn: () => ticketsApi.approve(ticketId, comment || undefined),
    onSuccess: onApproved,
  });

  return (
    <div className="fixed inset-0 bg-ink/30 flex items-center justify-center z-50 p-spacing-md">
      <div className="bg-surface-1 rounded-xl border border-hairline p-spacing-lg w-full max-w-md flex flex-col gap-spacing-md">
        <div className="flex items-start gap-spacing-sm">
          <CheckCircle2 size={20} className="text-semantic-success shrink-0 mt-0.5" />
          <div>
            <h2 className="text-subhead font-semibold text-ink">Aprovar chamado</h2>
            <p className="text-body-sm text-ink-muted mt-1">
              Ao aprovar, o chamado será processado automaticamente no sistema.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-body-sm font-medium text-ink">
            Comentário (opcional)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Adicione um comentário para o solicitante…"
            className="text-input w-full resize-none"
            maxLength={500}
          />
        </div>

        {mutation.isError && (
          <p className="text-caption text-semantic-error">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Erro ao aprovar chamado.'}
          </p>
        )}

        <div className="flex gap-spacing-sm justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Aprovar chamado
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  ticketId,
  onClose,
  onRejected,
}: {
  ticketId: string;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState('');
  const reasonError = reason.length > 0 && reason.length < 20;
  const mutation = useMutation({
    mutationFn: () => ticketsApi.reject(ticketId, reason),
    onSuccess: onRejected,
  });

  return (
    <div className="fixed inset-0 bg-ink/30 flex items-center justify-center z-50 p-spacing-md">
      <div className="bg-surface-1 rounded-xl border border-hairline p-spacing-lg w-full max-w-md flex flex-col gap-spacing-md">
        <div className="flex items-start gap-spacing-sm">
          <XCircle size={20} className="text-semantic-error shrink-0 mt-0.5" />
          <div>
            <h2 className="text-subhead font-semibold text-ink">Rejeitar chamado</h2>
            <p className="text-body-sm text-ink-muted mt-1">
              Informe o motivo da rejeição. O solicitante será notificado por e-mail.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-body-sm font-medium text-ink">
            Motivo da rejeição <span className="text-semantic-error">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da rejeição (mínimo 20 caracteres)…"
            className={`text-input w-full resize-none ${reasonError ? 'border-semantic-error' : ''}`}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            {reasonError && (
              <p className="text-caption text-semantic-error">
                Mínimo de 20 caracteres ({reason.length}/20)
              </p>
            )}
            <p className="text-caption text-ink-subtle ml-auto">{reason.length}/500</p>
          </div>
        </div>

        {mutation.isError && (
          <p className="text-caption text-semantic-error">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Erro ao rejeitar chamado.'}
          </p>
        )}

        <div className="flex gap-spacing-sm justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || reason.length < 20}
            className="btn-secondary flex items-center gap-2 text-semantic-error border-semantic-error/30 hover:bg-semantic-error/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Rejeitar chamado
          </button>
        </div>
      </div>
    </div>
  );
}

export function TicketDetailPage({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const reprocessMutation = useMutation({
    mutationFn: () => ticketsApi.reprocess(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id!),
    enabled: !!id,
  });

  const isApprover =
    ticket?.approverId === user.id &&
    (user.role === Role.GESTOR || user.role === Role.ADMIN);

  const canCancel =
    ticket &&
    ticket.status === TicketStatus.AGUARDANDO_APROVACAO &&
    ticket.requesterId === user.id;

  const canApproveOrReject =
    ticket &&
    ticket.status === TicketStatus.AGUARDANDO_APROVACAO &&
    isApprover;

  const canReprocess =
    ticket &&
    ticket.status === TicketStatus.FALHA_INTEGRACAO &&
    (user.role === Role.ANALISTA_TI || user.role === Role.ADMIN);

  const invalidateAndNavigate = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    navigate('/tickets');
  };

  const invalidateTicket = () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-spacing-xl">
        <Loader2 size={24} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex flex-col gap-spacing-md">
        <Link to="/tickets" className="btn-tertiary flex items-center gap-1.5 w-fit">
          <ChevronLeft size={14} />
          Voltar aos chamados
        </Link>
        <p className="text-body text-semantic-error">Chamado não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-spacing-lg max-w-content">
      <div className="flex items-center gap-spacing-sm">
        <Link to="/tickets" className="btn-tertiary flex items-center gap-1 px-spacing-xs py-1 text-caption">
          <ChevronLeft size={14} />
          Chamados
        </Link>
        <span className="text-ink-muted text-caption">/</span>
        <span className="text-caption text-ink font-mono">#{ticket.numero}</span>
      </div>

      {/* Header card */}
      <div className="bg-surface-1 rounded-xl border border-hairline p-spacing-lg flex flex-col gap-spacing-md">
        <div className="flex items-start justify-between gap-spacing-md flex-wrap">
          <div>
            <div className="flex items-center gap-spacing-sm flex-wrap">
              <span className="text-caption text-ink-muted font-mono">#{ticket.numero}</span>
              <StatusChip status={ticket.status} />
            </div>
            <h1 className="text-headline font-semibold text-ink mt-1">{ticket.catalogNome}</h1>
          </div>

          <div className="flex gap-spacing-sm flex-wrap">
            {canReprocess && (
              <button
                type="button"
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {reprocessMutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RefreshCw size={14} />}
                Reprocessar
              </button>
            )}
            {canApproveOrReject && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="btn-secondary text-semantic-error border-semantic-error/30 hover:bg-semantic-error/5"
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(true)}
                  className="btn-primary"
                >
                  Aprovar
                </button>
              </>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="btn-secondary text-semantic-error border-semantic-error/30 hover:bg-semantic-error/5"
              >
                Cancelar chamado
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-spacing-md pt-spacing-sm border-t border-hairline-soft">
          <div>
            <p className="text-caption text-ink-muted">Solicitante</p>
            <p className="text-body-sm text-ink font-medium">{ticket.requesterNome}</p>
          </div>
          <div>
            <p className="text-caption text-ink-muted">Aprovador</p>
            <p className="text-body-sm text-ink font-medium">{ticket.approverNome ?? '—'}</p>
          </div>
          <div>
            <p className="text-caption text-ink-muted">Aberto em</p>
            <p className="text-body-sm text-ink font-medium">{formatDate(ticket.openedAt)}</p>
          </div>
          {ticket.completedAt && (
            <div>
              <p className="text-caption text-ink-muted">Concluído em</p>
              <p className="text-body-sm text-ink font-medium">{formatDate(ticket.completedAt)}</p>
            </div>
          )}
          {ticket.rejectedAt && (
            <div>
              <p className="text-caption text-ink-muted">Rejeitado em</p>
              <p className="text-body-sm text-ink font-medium">{formatDate(ticket.rejectedAt)}</p>
            </div>
          )}
          {ticket.approvedAt && (
            <div>
              <p className="text-caption text-ink-muted">Aprovado em</p>
              <p className="text-body-sm text-ink font-medium">{formatDate(ticket.approvedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Approval comment */}
      {ticket.approvalComment && (
        <div className="bg-surface-1 border border-hairline rounded-md p-spacing-md">
          <p className="text-body-sm font-medium text-ink">Comentário do aprovador</p>
          <p className="text-body-sm text-ink-muted mt-1">{ticket.approvalComment}</p>
        </div>
      )}

      {/* Rejection reason */}
      {ticket.rejectionReason && (
        <div className="bg-semantic-error/10 border border-semantic-error/30 rounded-md p-spacing-md">
          <p className="text-body-sm font-medium text-semantic-error">Motivo da rejeição</p>
          <p className="text-body-sm text-ink mt-1">{ticket.rejectionReason}</p>
        </div>
      )}

      {/* Falha de integração — painel técnico (Analista TI / Admin) */}
      {ticket.status === TicketStatus.FALHA_INTEGRACAO &&
        (user.role === Role.ANALISTA_TI || user.role === Role.ADMIN) && (
          <div className="bg-semantic-error/5 border border-semantic-error/20 rounded-lg p-spacing-md flex flex-col gap-spacing-sm">
            <div className="flex items-center justify-between gap-spacing-sm">
              <div className="flex items-center gap-spacing-xs">
                <AlertTriangle size={16} className="text-semantic-error shrink-0" />
                <p className="text-body-sm font-medium text-semantic-error">Falha de integração CASI</p>
              </div>
              <span className="text-caption text-ink-muted">
                {ticket.integrationAttempts} tentativa{ticket.integrationAttempts !== 1 ? 's' : ''}
              </span>
            </div>
            {ticket.integrationLog != null && (
              <pre className="text-mono text-caption text-ink-muted bg-surface-1 border border-hairline-soft rounded-md p-spacing-sm overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(ticket.integrationLog as object, null, 2)}
              </pre>
            )}
            {reprocessMutation.isError && (
              <p className="text-caption text-semantic-error">
                {(reprocessMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  'Erro ao reprocessar chamado.'}
              </p>
            )}
            {reprocessMutation.isSuccess && (
              <p className="text-caption text-semantic-success">
                Chamado reenfileirado com sucesso.
              </p>
            )}
          </div>
        )}

      {/* Form data */}
      <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-col gap-spacing-md">
        <h2 className="text-subhead font-medium text-ink">Dados do chamado</h2>
        <FormDataDisplay formData={ticket.formData} />
      </div>

      {/* History */}
      <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-col gap-spacing-md">
        <h2 className="text-subhead font-medium text-ink">Histórico</h2>
        <HistoryTimeline ticket={ticket} />
      </div>

      {showCancelModal && (
        <CancelModal
          ticketId={ticket.id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            setShowCancelModal(false);
            invalidateAndNavigate();
          }}
        />
      )}

      {showApproveModal && (
        <ApproveModal
          ticketId={ticket.id}
          onClose={() => setShowApproveModal(false)}
          onApproved={invalidateTicket}
        />
      )}

      {showRejectModal && (
        <RejectModal
          ticketId={ticket.id}
          onClose={() => setShowRejectModal(false)}
          onRejected={invalidateTicket}
        />
      )}
    </div>
  );
}
