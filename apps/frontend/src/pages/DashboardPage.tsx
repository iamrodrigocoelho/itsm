import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { reportsApi } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const REPORT_COLORS = ['#3b72e8', '#2a9a5a', '#e84b8a', '#8bc34a', '#00b8d9', '#ff7a00', '#9c9fa5', '#626260'];

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Ag. Aprovação',
  APROVADO: 'Aprovado',
  EM_PROCESSAMENTO: 'Em Proc.',
  CONCLUIDO: 'Concluído',
  REJEITADO: 'Rejeitado',
  CANCELADO: 'Cancelado',
  FALHA_INTEGRACAO: 'Falha Integr.',
};

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
];

function KpiCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: 'error' | 'success' | 'default';
}) {
  const valueClass =
    accent === 'error'
      ? 'text-semantic-error'
      : accent === 'success'
        ? 'text-semantic-success'
        : 'text-ink';

  return (
    <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-col gap-1">
      <p className="text-eyebrow text-ink-muted uppercase tracking-widest">{label}</p>
      <p className={`text-display-md font-semibold ${valueClass}`}>{value}</p>
      {subtitle && <p className="text-body-sm text-ink-subtle">{subtitle}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [periodDays, setPeriodDays] = useState(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', periodDays],
    queryFn: () => reportsApi.getDashboard({ periodDays }),
    staleTime: 60_000,
  });

  const fmtHours = (h: number | null) =>
    h === null ? '—' : h < 1 ? `${Math.round(h * 60)}min` : `${h.toFixed(1)}h`;

  return (
    <div className="flex flex-col gap-spacing-xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-spacing-sm">
        <div>
          <h1 className="text-headline font-semibold text-ink">Dashboard</h1>
          <p className="text-body-sm text-ink-muted mt-0.5">Visão executiva dos chamados</p>
        </div>

        <div className="flex items-center gap-spacing-xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriodDays(opt.value)}
              className={[
                'px-spacing-sm py-1 rounded-xs text-caption font-medium border transition-colors',
                periodDays === opt.value
                  ? 'bg-ink text-on-primary border-ink'
                  : 'bg-surface-1 text-ink-muted border-hairline hover:text-ink hover:border-ink-muted',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="bg-surface-1 border border-semantic-error/30 rounded-lg p-spacing-lg text-semantic-error text-body-sm">
          Erro ao carregar dados do dashboard.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-spacing-md">
        <KpiCard
          label="Total de chamados"
          value={isLoading ? '…' : (data?.totalTickets ?? 0)}
          subtitle={`últimos ${periodDays} dias`}
        />
        <KpiCard
          label="Pendentes de aprovação"
          value={isLoading ? '…' : (data?.pendingApproval ?? 0)}
          accent={data && data.pendingApproval > 0 ? 'default' : 'default'}
        />
        <KpiCard
          label="Falhas de integração"
          value={isLoading ? '…' : (data?.integrationFailures ?? 0)}
          accent={data && data.integrationFailures > 0 ? 'error' : 'default'}
        />
        <KpiCard
          label="Tempo médio de aprovação"
          value={isLoading ? '…' : fmtHours(data?.avgApprovalTimeHours ?? null)}
        />
        <KpiCard
          label="Tempo médio de conclusão"
          value={isLoading ? '…' : fmtHours(data?.avgCompletionTimeHours ?? null)}
        />
        <KpiCard
          label="Taxa de aprovação"
          value={isLoading ? '…' : data?.approvalRate !== null && data?.approvalRate !== undefined ? `${data.approvalRate}%` : '—'}
          accent={
            data?.approvalRate !== null && data?.approvalRate !== undefined
              ? data.approvalRate >= 80
                ? 'success'
                : data.approvalRate < 50
                  ? 'error'
                  : 'default'
              : 'default'
          }
        />
      </div>

      {/* Charts row 1: by-day line + by-status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-spacing-md">
        {/* Line chart — by day */}
        <div className="lg:col-span-2 bg-surface-1 rounded-lg border border-hairline p-spacing-lg">
          <p className="text-card-title font-medium text-ink mb-spacing-md">Chamados por dia</p>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-ink-subtle text-body-sm">Carregando…</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.byDay ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => format(parseISO(v), 'd/M', { locale: ptBR })}
                  tick={{ fontSize: 11, fill: '#9c9fa5' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9c9fa5' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(v) => format(parseISO(v as string), 'dd/MM/yyyy', { locale: ptBR })}
                  formatter={(v) => [v, 'Chamados']}
                  contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e8e4df' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b72e8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — by status */}
        <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg">
          <p className="text-card-title font-medium text-ink mb-spacing-md">Por status</p>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-ink-subtle text-body-sm">Carregando…</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={(data?.byStatus ?? []).map((s) => ({
                    name: STATUS_LABELS[s.status] ?? s.status,
                    value: s.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {(data?.byStatus ?? []).map((_, i) => (
                    <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v) => [v, 'Chamados']}
                  contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e8e4df' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2: by-store + by-approver */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-spacing-md">
        {/* Horizontal bar — by origin store */}
        <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg">
          <p className="text-card-title font-medium text-ink mb-spacing-md">Chamados por loja de origem (top 10)</p>
          {isLoading ? (
            <div className="h-52 flex items-center justify-center text-ink-subtle text-body-sm">Carregando…</div>
          ) : (data?.byOriginStore ?? []).length === 0 ? (
            <div className="h-52 flex items-center justify-center text-ink-subtle text-body-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(data?.byOriginStore ?? []).map((s) => ({ name: `Loja ${s.codLoja}`, count: s.count }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9c9fa5' }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#626260' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(v) => [v, 'Chamados']}
                  contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e8e4df' }}
                />
                <Bar dataKey="count" fill="#3b72e8" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar — by approver avg time */}
        <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg">
          <p className="text-card-title font-medium text-ink mb-spacing-md">Tempo médio de aprovação por gestor (top 10)</p>
          {isLoading ? (
            <div className="h-52 flex items-center justify-center text-ink-subtle text-body-sm">Carregando…</div>
          ) : (data?.byApprover ?? []).length === 0 ? (
            <div className="h-52 flex items-center justify-center text-ink-subtle text-body-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(data?.byApprover ?? []).map((a) => ({
                  name: a.approverNome.split(' ')[0],
                  horas: a.avgHours,
                  chamados: a.count,
                }))}
                margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#626260' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9c9fa5' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v, name) => [
                    name === 'horas' ? `${Number(v).toFixed(1)}h` : v,
                    name === 'horas' ? 'Tempo médio' : 'Chamados',
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#e8e4df' }}
                />
                <Bar dataKey="horas" fill="#2a9a5a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
