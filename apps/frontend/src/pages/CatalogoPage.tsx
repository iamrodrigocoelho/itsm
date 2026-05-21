import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronRight, LayoutGrid } from 'lucide-react';
import { catalogsApi } from '@/lib/api';
import type { ServiceCatalogDto } from '@itsm/shared-types';

const ICON_MAP: Record<string, React.ReactNode> = {
  store: <Store size={24} />,
};

function CatalogCard({ catalog }: { catalog: ServiceCatalogDto }) {
  return (
    <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-col gap-spacing-sm">
      {catalog.categoria && (
        <span className="text-eyebrow text-ink-muted">{catalog.categoria}</span>
      )}

      <div className="flex items-start gap-spacing-sm">
        <div className="text-ink-muted shrink-0 mt-0.5">
          {catalog.icone && ICON_MAP[catalog.icone]
            ? ICON_MAP[catalog.icone]
            : <LayoutGrid size={24} />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-card-title font-semibold text-ink">{catalog.nome}</h2>
          <p className="text-body-sm text-ink-muted mt-spacing-xs leading-relaxed">
            {catalog.descricao}
          </p>
        </div>
      </div>

      <div className="pt-spacing-sm border-t border-hairline-soft flex justify-end">
        <Link
          to={`/tickets/novo/${catalog.slug}`}
          className="btn-primary flex items-center gap-1.5 text-button"
        >
          Abrir chamado
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export function CatalogoPage() {
  const { data: catalogs, isLoading, isError } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => catalogsApi.list({ ativo: true }),
  });

  const grouped = catalogs?.reduce<Record<string, ServiceCatalogDto[]>>((acc, c) => {
    const cat = c.categoria ?? 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-spacing-lg">
      <div>
        <h1 className="text-headline font-semibold text-ink">Catálogo de Serviços</h1>
        <p className="text-body-sm text-ink-muted mt-1">
          Selecione um serviço para abrir um chamado.
        </p>
      </div>

      {isLoading && (
        <div className="p-spacing-xl text-center text-ink-muted text-body-sm">Carregando…</div>
      )}

      {isError && (
        <div className="p-spacing-xl text-center text-semantic-error text-body-sm">
          Erro ao carregar catálogo de serviços.
        </div>
      )}

      {grouped &&
        Object.entries(grouped).map(([categoria, items]) => (
          <section key={categoria} className="flex flex-col gap-spacing-sm">
            <h2 className="text-eyebrow text-ink-muted uppercase tracking-wide">{categoria}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-spacing-md">
              {items.map((c) => (
                <CatalogCard key={c.id} catalog={c} />
              ))}
            </div>
          </section>
        ))}

      {catalogs?.length === 0 && (
        <div className="bg-surface-1 rounded-xl border border-hairline p-12 text-center">
          <LayoutGrid size={32} className="mx-auto text-ink-subtle mb-spacing-sm" />
          <p className="text-body text-ink-muted">Nenhum serviço disponível no momento.</p>
        </div>
      )}
    </div>
  );
}
