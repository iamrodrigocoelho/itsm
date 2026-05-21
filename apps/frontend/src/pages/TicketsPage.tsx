import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, Download, Filter, X } from 'lucide-react';
import { ticketsApi } from '@/lib/api';
import type { TicketsListParams } from '@/lib/api';
import type { TicketSummaryDto } from '@itsm/shared-types';
import { TicketStatus } from '@itsm/shared-types';
import { formatDate } from '@/lib/utils';

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

const STATUS_CHIP: Record<string, string> = {
  RASCUNHO: 'text-ink-subtle border-ink-subtle/30',
  AGUARDANDO_APROVACAO: 'text-report-blue border-report-blue/30',
  APROVADO: 'text-ink-muted border-ink-muted/30',
  EM_PROCESSAMENTO: 'text-report-cyan border-report-cyan/30',
  CONCLUIDO: 'text-semantic-success border-semantic-success/30',
  REJEITADO: 'text-semantic-error border-semantic-error/30',
  CANCELADO: 'text-ink-tertiary border-ink-tertiary/30',
  FALHA_INTEGRACAO: 'text-semantic-error border-semantic-error/30',
};

const QUICK_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: TicketStatus.AGUARDANDO_APROVACAO, label: 'Aguardando Aprovação' },
  { value: TicketStatus.APROVADO, label: 'Aprovado' },
  { value: TicketStatus.EM_PROCESSAMENTO, label: 'Em Processamento' },
  { value: TicketStatus.CONCLUIDO, label: 'Concluído' },
  { value: TicketStatus.REJEITADO, label: 'Rejeitado' },
  { value: TicketStatus.CANCELADO, label: 'Cancelado' },
  { value: TicketStatus.FALHA_INTEGRACAO, label: 'Falha de Integração' },
];

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xs text-caption font-medium border ${STATUS_CHIP[status] ?? 'text-ink-muted border-hairline'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TicketRow({ ticket }: { ticket: TicketSummaryDto }) {
  return (
    <div className="bg-surface-1 border border-hairline rounded-lg px-spacing-lg py-spacing-md flex items-center gap-spacing-md">
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-spacing-sm flex-wrap">
          <span className="text-caption text-ink-muted font-mono">#{ticket.numero}</span>
          <StatusChip status={ticket.status} />
          <span className="text-caption text-ink-muted">{ticket.catalogNome}</span>
        </div>
        <p className="text-body-sm font-medium text-ink truncate">
          Solicitante: {ticket.requesterNome}
        </p>
        {ticket.approverNome && (
          <p className="text-caption text-ink-muted">
            Aprovador: {ticket.approverNome}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className="text-caption text-ink-muted">{formatDate(ticket.openedAt)}</p>
        <Link
          to={`/tickets/${ticket.id}`}
          className="btn-tertiary flex items-center gap-1 text-caption px-spacing-sm py-1"
        >
          Ver detalhes
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function AdvancedFilters({
  filters,
  onChange,
  onClose,
}: {
  filters: TicketsListParams;
  onChange: (f: TicketsListParams) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<TicketsListParams>(filters);

  const field = (key: keyof TicketsListParams, label: string, type = 'text') => (
    <label className="flex flex-col gap-1">
      <span className="text-caption text-ink-muted">{label}</span>
      <input
        type={type}
        value={(local[key] as string | number | undefined) ?? ''}
        onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value || undefined }))}
        className="text-input text-body-sm"
        placeholder={type === 'date' ? 'aaaa-mm-dd' : ''}
      />
    </label>
  );

  return (
    <div className="bg-surface-1 border border-hairline rounded-lg p-spacing-lg flex flex-col gap-spacing-md">
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium text-ink flex items-center gap-1.5">
          <Filter size={14} /> Filtros avançados
        </p>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-spacing-sm">
        {field('numero', 'Número do chamado', 'number')}
        <label className="flex flex-col gap-1">
          <span className="text-caption text-ink-muted">Status</span>
          <select
            value={local.status ?? ''}
            onChange={(e) => setLocal((p) => ({ ...p, status: e.target.value || undefined }))}
            className="text-input text-body-sm"
          >
            <option value="">Todos</option>
            {QUICK_STATUS_OPTIONS.slice(1).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {field('openedAtFrom', 'Aberto a partir de', 'date')}
        {field('openedAtTo', 'Aberto até', 'date')}
        {field('completedAtFrom', 'Concluído a partir de', 'date')}
        {field('completedAtTo', 'Concluído até', 'date')}
      </div>

      <div className="flex items-center gap-spacing-sm">
        <button
          type="button"
          onClick={() => {
            // Convert date-only strings to ISO datetime for the API
            const toISO = (v?: string, end = false) =>
              v ? `${v}T${end ? '23:59:59' : '00:00:00'}.000Z` : undefined;
            onChange({
              ...local,
              openedAtFrom: toISO(local.openedAtFrom as string | undefined),
              openedAtTo: toISO(local.openedAtTo as string | undefined, true),
              completedAtFrom: toISO(local.completedAtFrom as string | undefined),
              completedAtTo: toISO(local.completedAtTo as string | undefined, true),
            });
            onClose();
          }}
          className="btn-primary text-caption"
        >
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={() => {
            setLocal({});
            onChange({});
          }}
          className="btn-secondary text-caption"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

export function TicketsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<TicketsListParams>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params: TicketsListParams = {
    page,
    limit: 20,
    status: advancedFilters.status ?? (statusFilter || undefined),
    ...advancedFilters,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsApi.list(params),
  });

  const hasAdvancedActive = Object.values(advancedFilters).some((v) => v !== undefined && v !== '');

  const handleExport = async () => {
    setExporting(true);
    try {
      await ticketsApi.exportCsv(params);
    } catch {
      // Error is swallowed; user sees no file download
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-spacing-lg">
      <div className="flex items-center justify-between flex-wrap gap-spacing-sm">
        <div>
          <h1 className="text-headline font-semibold text-ink">Chamados</h1>
          {data && (
            <p className="text-body-sm text-ink-muted mt-1">
              {data.total} chamado{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-spacing-sm">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5 text-caption disabled:opacity-50"
          >
            <Download size={13} />
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <Link to="/catalogo" className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            Novo chamado
          </Link>
        </div>
      </div>

      {/* Quick status filter pills */}
      <div className="flex items-center gap-spacing-sm flex-wrap">
        {QUICK_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setStatusFilter(opt.value);
              setAdvancedFilters((p) => ({ ...p, status: opt.value || undefined }));
              setPage(1);
            }}
            className={[
              'px-spacing-sm py-1 rounded-xs text-caption font-medium border transition-colors',
              (advancedFilters.status ?? statusFilter) === opt.value
                ? 'bg-ink text-on-primary border-ink'
                : 'bg-surface-1 text-ink-muted border-hairline hover:text-ink hover:border-ink-muted',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className={[
            'ml-auto px-spacing-sm py-1 rounded-xs text-caption font-medium border flex items-center gap-1 transition-colors',
            hasAdvancedActive
              ? 'bg-ink text-on-primary border-ink'
              : 'bg-surface-1 text-ink-muted border-hairline hover:text-ink hover:border-ink-muted',
          ].join(' ')}
        >
          <Filter size={12} />
          Filtros avançados
          {hasAdvancedActive && ' •'}
        </button>
      </div>

      {showAdvanced && (
        <AdvancedFilters
          filters={advancedFilters}
          onChange={(f) => {
            setAdvancedFilters(f);
            setStatusFilter(f.status ?? '');
            setPage(1);
          }}
          onClose={() => setShowAdvanced(false)}
        />
      )}

      {isLoading && (
        <div className="p-spacing-xl text-center text-ink-muted text-body-sm">Carregando…</div>
      )}

      {isError && (
        <div className="p-spacing-xl text-center text-semantic-error text-body-sm">
          Erro ao carregar chamados.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col gap-spacing-sm">
          {data?.data.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}

          {data?.data.length === 0 && (
            <div className="bg-surface-1 rounded-xl border border-hairline p-12 text-center">
              <p className="text-body text-ink-muted">Nenhum chamado encontrado.</p>
              <Link to="/catalogo" className="btn-primary mt-spacing-md inline-flex">
                Abrir primeiro chamado
              </Link>
            </div>
          )}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-ink-muted">
            Página {page} de {data.totalPages}
          </p>
          <div className="flex gap-spacing-xs">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="btn-secondary disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
