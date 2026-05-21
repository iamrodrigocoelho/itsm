import type { PrismaClient } from '@prisma/client';
import type { DashboardStatsDto } from '@itsm/shared-types';
import type { Redis } from 'ioredis';
import type { DashboardQueryInput } from './reports.schemas.js';

const CACHE_TTL = 300; // 5 minutes

export class ReportsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  async getDashboard(
    input: DashboardQueryInput,
    actorUserId: string,
    actorRole: string,
  ): Promise<DashboardStatsDto> {
    const cacheKey = `dashboard:${input.periodDays}:${input.catalogSlug ?? 'all'}:${actorRole}:${actorUserId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as DashboardStatsDto;

    const result = await this.compute(input, actorUserId, actorRole);
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
    return result;
  }

  private async compute(
    input: DashboardQueryInput,
    actorUserId: string,
    actorRole: string,
  ): Promise<DashboardStatsDto> {
    const since = new Date();
    since.setDate(since.getDate() - input.periodDays);

    // Base scope filter (same scoping rules as tickets list)
    const scopeFilter =
      actorRole === 'COLABORADOR'
        ? { requesterId: actorUserId }
        : actorRole === 'GESTOR'
          ? { OR: [{ requesterId: actorUserId }, { approverId: actorUserId }] }
          : {};

    // Catalog filter
    let catalogFilter = {};
    if (input.catalogSlug) {
      const catalog = await this.prisma.serviceCatalog.findUnique({
        where: { slug: input.catalogSlug },
        select: { id: true },
      });
      if (catalog) catalogFilter = { catalogId: catalog.id };
    }

    const periodFilter = { openedAt: { gte: since } };
    const where = { ...scopeFilter, ...catalogFilter, ...periodFilter };

    const [
      totalTickets,
      pendingApproval,
      integrationFailures,
      byStatusRaw,
    ] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.count({ where: { ...where, status: 'AGUARDANDO_APROVACAO' } }),
      this.prisma.ticket.count({ where: { ...where, status: 'FALHA_INTEGRACAO' } }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
    ]);

    // Avg approval time: avg(approvedAt - openedAt) for tickets with approvedAt set
    const approvedTickets = await this.prisma.ticket.findMany({
      where: { ...where, approvedAt: { not: null } },
      select: { openedAt: true, approvedAt: true },
    });
    const avgApprovalTimeHours =
      approvedTickets.length > 0
        ? approvedTickets.reduce((sum, t) => {
            const ms = t.approvedAt!.getTime() - t.openedAt.getTime();
            return sum + ms / (1000 * 60 * 60);
          }, 0) / approvedTickets.length
        : null;

    // Avg completion time: avg(completedAt - openedAt)
    const completedTickets = await this.prisma.ticket.findMany({
      where: { ...where, completedAt: { not: null } },
      select: { openedAt: true, completedAt: true },
    });
    const avgCompletionTimeHours =
      completedTickets.length > 0
        ? completedTickets.reduce((sum, t) => {
            const ms = t.completedAt!.getTime() - t.openedAt.getTime();
            return sum + ms / (1000 * 60 * 60);
          }, 0) / completedTickets.length
        : null;

    // Approval rate: (approved + em_processamento + concluido) / total excl rascunho
    const actionableTotal = await this.prisma.ticket.count({
      where: { ...where, status: { not: 'RASCUNHO' } },
    });
    const approvedCount = await this.prisma.ticket.count({
      where: {
        ...where,
        status: { in: ['APROVADO', 'EM_PROCESSAMENTO', 'CONCLUIDO'] },
      },
    });
    const approvalRate =
      actionableTotal > 0
        ? Math.round((approvedCount / actionableTotal) * 100 * 10) / 10
        : null;

    // By day: last N days
    const byDay = await this.getByDay(where, input.periodDays);

    // By origin store (join with requester's codLojaAtual)
    const byOriginStore = await this.getByOriginStore(where);

    // By approver: avg approval time per approver (top 10)
    const byApprover = await this.getByApprover(where);

    return {
      totalTickets,
      pendingApproval,
      integrationFailures,
      avgApprovalTimeHours: avgApprovalTimeHours !== null ? Math.round(avgApprovalTimeHours * 10) / 10 : null,
      avgCompletionTimeHours: avgCompletionTimeHours !== null ? Math.round(avgCompletionTimeHours * 10) / 10 : null,
      approvalRate,
      byStatus: byStatusRaw.map((r) => ({ status: r.status, count: r._count.id })),
      byDay,
      byOriginStore,
      byApprover,
    };
  }

  private async getByDay(
    where: Record<string, unknown>,
    periodDays: number,
  ): Promise<{ date: string; count: number }[]> {
    type DayRow = { day: Date; count: bigint };
    const rows = await this.prisma.$queryRaw<DayRow[]>`
      SELECT DATE_TRUNC('day', "openedAt") AS day, COUNT(*) AS count
      FROM tickets
      WHERE "openedAt" >= NOW() - (${periodDays} || ' days')::INTERVAL
      GROUP BY day
      ORDER BY day ASC
    `;

    // Fill missing days with 0
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.day.toISOString().slice(0, 10), Number(r.count));
    }

    const result: { date: string; count: number }[] = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }

  private async getByOriginStore(
    _where: Record<string, unknown>,
  ): Promise<{ codLoja: number; count: number }[]> {
    type StoreRow = { codLoja: number; count: bigint };
    // Join tickets with requester user to get origin store (codLojaAtual at query time)
    // This is an approximation — loja at time of ticket creation is not separately stored
    const rows = await this.prisma.$queryRaw<StoreRow[]>`
      SELECT u."codLojaAtual" AS "codLoja", COUNT(t.id) AS count
      FROM tickets t
      JOIN users u ON u.id = t."requesterId"
      GROUP BY u."codLojaAtual"
      ORDER BY count DESC
      LIMIT 10
    `;
    return rows.map((r) => ({ codLoja: r.codLoja, count: Number(r.count) }));
  }

  private async getByApprover(
    _where: Record<string, unknown>,
  ): Promise<{ approverNome: string; avgHours: number; count: number }[]> {
    type ApproverRow = { nome: string; avgMs: number; count: bigint };
    const rows = await this.prisma.$queryRaw<ApproverRow[]>`
      SELECT
        u.nome,
        AVG(EXTRACT(EPOCH FROM (t."approvedAt" - t."openedAt")) / 3600) AS "avgMs",
        COUNT(t.id) AS count
      FROM tickets t
      JOIN users u ON u.id = t."approverId"
      WHERE t."approvedAt" IS NOT NULL
      GROUP BY u.nome
      ORDER BY count DESC
      LIMIT 10
    `;
    return rows.map((r) => ({
      approverNome: r.nome,
      avgHours: Math.round(Number(r.avgMs) * 10) / 10,
      count: Number(r.count),
    }));
  }
}
