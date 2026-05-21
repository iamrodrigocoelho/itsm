import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Plus, Upload, Search } from 'lucide-react';
import { usersApi } from '@/lib/api';
import type { UserSummaryDto } from '@itsm/shared-types';

const helper = createColumnHelper<UserSummaryDto>();

const STATUS_CHIP: Record<string, string> = {
  ATIVO: 'bg-semantic-success/10 text-semantic-success border-semantic-success/30',
  INATIVO: 'bg-ink-tertiary/10 text-ink-tertiary border-ink-tertiary/30',
};

const ROLE_LABELS: Record<string, string> = {
  COLABORADOR: 'Colaborador',
  GESTOR: 'Gestor',
  ANALISTA_TI: 'Analista TI',
  AUDITOR: 'Auditor',
  ADMIN: 'Admin',
};

const columns = [
  helper.accessor('matricula', { header: 'Matrícula', size: 100 }),
  helper.accessor('nome', { header: 'Nome' }),
  helper.accessor('email', { header: 'E-mail' }),
  helper.accessor('role', {
    header: 'Perfil',
    cell: (info) => ROLE_LABELS[info.getValue()] ?? info.getValue(),
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-xs text-caption font-medium border ${STATUS_CHIP[info.getValue()] ?? ''}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  helper.display({
    id: 'actions',
    header: '',
    cell: (info) => (
      <Link
        to={`/admin/usuarios/${info.row.original.id}`}
        className="text-body-sm text-ink-muted hover:text-ink underline"
      >
        Editar
      </Link>
    ),
  }),
];

export function UsuariosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.list({ page, limit: 20, search: search || undefined }),
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="flex flex-col gap-spacing-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline font-semibold text-ink">Usuários</h1>
          {data && (
            <p className="text-body-sm text-ink-muted mt-1">{data.total} usuário{data.total !== 1 ? 's' : ''}</p>
          )}
        </div>

        <div className="flex items-center gap-spacing-sm">
          <Link to="/admin/usuarios/importar" className="btn-secondary flex items-center gap-2">
            <Upload size={14} />
            Importar CSV
          </Link>
          <Link to="/admin/usuarios/novo" className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            Novo usuário
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-spacing-sm">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nome, e-mail ou matrícula…"
          className="text-input flex-1"
        />
        <button type="submit" className="btn-secondary flex items-center gap-2">
          <Search size={14} />
          Buscar
        </button>
      </form>

      <div className="bg-surface-1 border border-hairline rounded-lg overflow-hidden">
        {isLoading && (
          <div className="p-spacing-xl text-center text-ink-muted text-body-sm">Carregando…</div>
        )}

        {isError && (
          <div className="p-spacing-xl text-center text-semantic-error text-body-sm">
            Erro ao carregar usuários.
          </div>
        )}

        {!isLoading && !isError && (
          <table className="w-full text-body-sm">
            <thead className="bg-surface-2 border-b border-hairline">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-spacing-md py-spacing-sm text-left font-medium text-ink-muted"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-hairline-soft last:border-0 ${idx % 2 === 1 ? 'bg-surface-2/40' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-spacing-md py-spacing-sm text-ink">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-spacing-md py-spacing-xl text-center text-ink-muted">
                    Nenhum usuário encontrado.
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
