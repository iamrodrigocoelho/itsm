import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { auditApi } from '@/lib/api';
import type { AuditLogDto } from '@itsm/shared-types';

const ACTION_CHIP: Record<string, string> = {
  LOGIN: 'bg-semantic-success/10 text-semantic-success border-semantic-success/30',
  LOGOUT: 'bg-ink-tertiary/10 text-ink-tertiary border-ink-tertiary/30',
  LOGIN_FAILED: 'bg-semantic-error/10 text-semantic-error border-semantic-error/30',
  CREATE: 'bg-report-blue/10 text-report-blue border-report-blue/30',
  UPDATE: 'bg-report-orange/10 text-report-orange border-report-orange/30',
  DELETE: 'bg-semantic-error/10 text-semantic-error border-semantic-error/30',
  IMPORT_CSV: 'bg-report-cyan/10 text-report-cyan border-report-cyan/30',
  PASSWORD_CHANGE: 'bg-report-lime/10 text-report-lime border-report-lime/30',
};

function ActionChip({ action }: { action: string }) {
  const cls = ACTION_CHIP[action] ?? 'bg-ink-tertiary/10 text-ink-tertiary border-ink-tertiary/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-xs text-caption font-medium border ${cls}`}>
      {action}
    </span>
  );
}

export function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    actorUserId: '',
    from: '',
    to: '',
  });
  const [applied, setApplied] = useState(filters);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', page, applied],
    queryFn: () =>
      auditApi.list({
        page,
        limit: 20,
        ...(applied.entityType ? { entityType: applied.entityType } : {}),
        ...(applied.action ? { action: applied.action } : {}),
        ...(applied.actorUserId ? { actorUserId: applied.actorUserId } : {}),
        ...(applied.from ? { from: new Date(applied.from).toISOString() } : {}),
        ...(applied.to ? { to: new Date(applied.to).toISOString() } : {}),
      }),
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  };

  return (
    <div className="flex flex-col gap-spacing-lg">
      <div>
        <h1 className="text-headline font-semibold text-ink">Auditoria</h1>
        {data && (
          <p className="text-body-sm text-ink-muted mt-1">{data.total} registro{data.total !== 1 ? 's' : ''}</p>
        )}
      </div>

      <form onSubmit={applyFilters} className="bg-surface-1 border border-hairline rounded-lg p-spacing-md flex flex-wrap gap-spacing-sm items-end">
        <div>
          <label className="block text-caption text-ink-muted mb-spacing-xxs">Entidade</label>
          <input
            type="text"
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            placeholder="User, Ticket…"
            className="text-input w-36"
          />
        </div>
        <div>
          <label className="block text-caption text-ink-muted mb-spacing-xxs">Ação</label>
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            placeholder="LOGIN, CREATE…"
            className="text-input w-36"
          />
        </div>
        <div>
          <label className="block text-caption text-ink-muted mb-spacing-xxs">Ator (ID)</label>
          <input
            type="text"
            value={filters.actorUserId}
            onChange={(e) => setFilters((f) => ({ ...f, actorUserId: e.target.value }))}
            placeholder="UUID do ator"
            className="text-input w-52"
          />
        </div>
        <div>
          <label className="block text-caption text-ink-muted mb-spacing-xxs">De</label>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="text-input"
          />
        </div>
        <div>
          <label className="block text-caption text-ink-muted mb-spacing-xxs">Até</label>
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="text-input"
          />
        </div>

        <button type="submit" className="btn-secondary flex items-center gap-2">
          <Search size={14} />
          Filtrar
        </button>
      </form>

      <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
        {isLoading && (
          <div className="p-spacing-xl text-center text-ink-muted text-body-sm">Carregando…</div>
        )}

        {isError && (
          <div className="p-spacing-xl text-center text-semantic-error text-body-sm">
            Erro ao carregar logs de auditoria.
          </div>
        )}

        {!isLoading && !isError && (
          <table className="w-full text-body-sm">
            <thead className="bg-surface-2 border-b border-hairline">
              <tr>
                <th className="px-spacing-md py-spacing-sm text-left font-medium text-ink-muted">Data/Hora</th>
                <th className="px-spacing-md py-spacing-sm text-left font-medium text-ink-muted">Ação</th>
                <th className="px-spacing-md py-spacing-sm text-left font-medium text-ink-muted">Entidade</th>
                <th className="px-spacing-md py-spacing-sm text-left font-medium text-ink-muted">Ator</th>
                <th className="px-spacing-md py-spacing-sm text-left font-medium text-ink-muted">IP</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((log: AuditLogDto, idx) => (
                <tr
                  key={log.id}
                  className={`border-b border-hairline-soft last:border-0 ${idx % 2 === 1 ? 'bg-surface-2/40' : ''}`}
                >
                  <td className="px-spacing-md py-spacing-sm text-ink-muted font-mono text-caption whitespace-nowrap">
                    {format(new Date(log.createdAt), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                  </td>
                  <td className="px-spacing-md py-spacing-sm">
                    <ActionChip action={log.action} />
                  </td>
                  <td className="px-spacing-md py-spacing-sm text-ink">
                    <span className="font-medium">{log.entityType}</span>
                    <span className="text-ink-muted ml-spacing-xxs text-caption font-mono">{log.entityId.slice(0, 8)}…</span>
                  </td>
                  <td className="px-spacing-md py-spacing-sm text-ink">
                    {log.actorNome ?? (log.actorUserId ? log.actorUserId.slice(0, 8) + '…' : '—')}
                  </td>
                  <td className="px-spacing-md py-spacing-sm text-ink-muted font-mono text-caption">
                    {log.actorIp ?? '—'}
                  </td>
                </tr>
              ))}

              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-spacing-md py-spacing-xl text-center text-ink-muted">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
