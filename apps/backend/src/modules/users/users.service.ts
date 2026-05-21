import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import { AuditService } from '../../shared/services/audit.service.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersInput,
  ImportCsvInput,
} from './users.schemas.js';
import type { UserDetailDto, UserSummaryDto, PaginatedResponseDto, CsvImportJobDto } from '@itsm/shared-types';

const BCRYPT_ROUNDS = 12;
const CSV_MAX_ROWS = 500;

function toSummary(user: {
  id: string; matricula: string; nome: string; email: string;
  role: string; status: string; codDominio: number; codEmpresa: number;
  codLojaAtual: number; mustChangePassword: boolean;
}): UserSummaryDto {
  return {
    id: user.id,
    matricula: user.matricula,
    nome: user.nome,
    email: user.email,
    role: user.role as UserSummaryDto['role'],
    status: user.status as UserSummaryDto['status'],
    codDominio: user.codDominio,
    codEmpresa: user.codEmpresa,
    codLojaAtual: user.codLojaAtual,
    mustChangePassword: user.mustChangePassword,
  };
}

function toDetail(user: {
  id: string; matricula: string; nome: string; email: string;
  role: string; status: string; codDominio: number; codEmpresa: number;
  codLojaAtual: number; mustChangePassword: boolean;
  cpf: string | null; telefone: string | null;
  managerId: string | null; manager: { nome: string } | null;
  createdAt: Date; updatedAt: Date; lastLoginAt: Date | null;
}): UserDetailDto {
  return {
    ...toSummary(user),
    cpf: user.cpf,
    telefone: user.telefone,
    managerId: user.managerId,
    managerNome: user.manager?.nome ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export class UsersService {
  private readonly audit: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.audit = new AuditService(prisma);
  }

  async list(input: ListUsersInput): Promise<PaginatedResponseDto<UserSummaryDto>> {
    const { page, limit, search, role, status } = input;
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { matricula: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(role ? { role: role as never } : {}),
      ...(status ? { status: status as never } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(toSummary),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string): Promise<UserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { manager: { select: { nome: true } } },
    });

    if (!user) throw new NotFoundError('Usuário', id);
    return toDetail(user);
  }

  async create(input: CreateUserInput, actorUserId: string, actorIp?: string): Promise<UserDetailDto> {
    const [emailExists, matriculaExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: input.email } }),
      this.prisma.user.findUnique({ where: { matricula: input.matricula } }),
    ]);

    if (emailExists) throw new ConflictError(`E-mail "${input.email}" já está em uso`);
    if (matriculaExists) throw new ConflictError(`Matrícula "${input.matricula}" já está em uso`);

    if (input.managerId) {
      const manager = await this.prisma.user.findUnique({ where: { id: input.managerId } });
      if (!manager) throw new NotFoundError('Gestor', input.managerId);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        matricula: input.matricula,
        nome: input.nome,
        email: input.email,
        passwordHash,
        role: input.role as never,
        codDominio: input.codDominio,
        codEmpresa: input.codEmpresa,
        codLojaAtual: input.codLojaAtual,
        cpf: input.cpf ?? null,
        telefone: input.telefone ?? null,
        managerId: input.managerId ?? null,
        mustChangePassword: true,
      },
      include: { manager: { select: { nome: true } } },
    });

    await this.audit.log({
      entityType: 'User',
      entityId: user.id,
      action: 'CREATE',
      actorUserId,
      actorIp,
      afterValue: { matricula: user.matricula, email: user.email, role: user.role },
    });

    return toDetail(user);
  }

  async update(id: string, input: UpdateUserInput, actorUserId: string, actorIp?: string): Promise<UserDetailDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { manager: { select: { nome: true } } },
    });

    if (!existing) throw new NotFoundError('Usuário', id);

    if (input.email && input.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (conflict) throw new ConflictError(`E-mail "${input.email}" já está em uso`);
    }

    const before = toDetail(existing);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.role !== undefined ? { role: input.role as never } : {}),
        ...(input.status !== undefined ? { status: input.status as never } : {}),
        ...(input.codDominio !== undefined ? { codDominio: input.codDominio } : {}),
        ...(input.codEmpresa !== undefined ? { codEmpresa: input.codEmpresa } : {}),
        ...(input.codLojaAtual !== undefined ? { codLojaAtual: input.codLojaAtual } : {}),
        ...(input.cpf !== undefined ? { cpf: input.cpf } : {}),
        ...(input.telefone !== undefined ? { telefone: input.telefone } : {}),
      },
      include: { manager: { select: { nome: true } } },
    });

    await this.audit.log({
      entityType: 'User',
      entityId: id,
      action: 'UPDATE',
      actorUserId,
      actorIp,
      beforeValue: before,
      afterValue: toDetail(user),
    });

    return toDetail(user);
  }

  async softDelete(id: string, actorUserId: string, actorIp?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('Usuário', id);

    await this.prisma.user.update({
      where: { id },
      data: { status: 'INATIVO' },
    });

    await this.audit.log({
      entityType: 'User',
      entityId: id,
      action: 'DELETE',
      actorUserId,
      actorIp,
      beforeValue: { status: user.status },
      afterValue: { status: 'INATIVO' },
    });
  }

  async setManager(userId: string, managerId: string, actorUserId: string, actorIp?: string): Promise<UserDetailDto> {
    if (userId === managerId) {
      throw new ValidationError('Um usuário não pode ser gestor de si mesmo');
    }

    const [user, manager] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: managerId } }),
    ]);

    if (!user) throw new NotFoundError('Usuário', userId);
    if (!manager) throw new NotFoundError('Gestor', managerId);

    // DFS anti-cycle: walk manager's chain — if we hit userId, it's a cycle
    await this.detectHierarchyCycle(managerId, userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { managerId },
      include: { manager: { select: { nome: true } } },
    });

    await this.audit.log({
      entityType: 'User',
      entityId: userId,
      action: 'UPDATE',
      actorUserId,
      actorIp,
      beforeValue: { managerId: user.managerId },
      afterValue: { managerId },
    });

    return toDetail(updated);
  }

  async removeManager(userId: string, actorUserId: string, actorIp?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuário', userId);

    await this.prisma.user.update({ where: { id: userId }, data: { managerId: null } });

    await this.audit.log({
      entityType: 'User',
      entityId: userId,
      action: 'UPDATE',
      actorUserId,
      actorIp,
      beforeValue: { managerId: user.managerId },
      afterValue: { managerId: null },
    });
  }

  async importCsv(input: ImportCsvInput, actorUserId: string, actorIp?: string): Promise<CsvImportJobDto> {
    const lines = input.content.split('\n').map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      throw new ValidationError('CSV deve conter cabeçalho e ao menos uma linha de dados');
    }

    if (lines.length - 1 > CSV_MAX_ROWS) {
      throw new ValidationError(`CSV excede o limite de ${CSV_MAX_ROWS} linhas`);
    }

    const job = await this.prisma.csvImportJob.create({
      data: {
        filename: input.filename,
        uploadedBy: actorUserId,
        status: 'PROCESSING',
        totalRows: lines.length - 1,
      },
    });

    const headers = parseRow(lines[0]!);
    const required = ['matricula', 'nome', 'email', 'codDominio', 'codEmpresa', 'codLojaAtual'];

    for (const col of required) {
      if (!headers.includes(col)) {
        await this.prisma.csvImportJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', finishedAt: new Date(), errorReport: { error: `Coluna obrigatória ausente: ${col}` } },
        });
        return toCsvJobDto(await this.prisma.csvImportJob.findUniqueOrThrow({ where: { id: job.id } }));
      }
    }

    const errors: Array<{ row: number; error: string }> = [];
    let successRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]!);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

      try {
        const codDominio = parseInt(row['codDominio'] ?? '', 10);
        const codEmpresa = parseInt(row['codEmpresa'] ?? '', 10);
        const codLojaAtual = parseInt(row['codLojaAtual'] ?? '', 10);

        if (!row['matricula'] || !row['nome'] || !row['email']) {
          throw new Error('matricula, nome e email são obrigatórios');
        }
        if (isNaN(codDominio) || isNaN(codEmpresa) || isNaN(codLojaAtual)) {
          throw new Error('codDominio, codEmpresa e codLojaAtual devem ser numéricos');
        }

        const role = (row['role'] || 'COLABORADOR') as never;
        const password = row['password'] || generateTempPassword();

        const existing = await this.prisma.user.findUnique({ where: { matricula: row['matricula'] } });

        if (existing) {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              nome: row['nome'],
              email: row['email'],
              role,
              codDominio,
              codEmpresa,
              codLojaAtual,
              ...(row['cpf'] ? { cpf: row['cpf'] } : {}),
              ...(row['telefone'] ? { telefone: row['telefone'] } : {}),
            },
          });
        } else {
          const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await this.prisma.user.create({
            data: {
              matricula: row['matricula'],
              nome: row['nome'],
              email: row['email'],
              passwordHash,
              role,
              codDominio,
              codEmpresa,
              codLojaAtual,
              cpf: row['cpf'] || null,
              telefone: row['telefone'] || null,
              mustChangePassword: true,
            },
          });
        }

        successRows++;
      } catch (err) {
        errors.push({ row: i + 1, error: err instanceof Error ? err.message : 'Erro desconhecido' });
      }
    }

    const finalJob = await this.prisma.csvImportJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        successRows,
        errorRows: errors.length,
        errorReport: errors.length > 0 ? (errors as never) : null,
        finishedAt: new Date(),
      },
    });

    await this.audit.log({
      entityType: 'CsvImportJob',
      entityId: job.id,
      action: 'IMPORT_CSV',
      actorUserId,
      actorIp,
      afterValue: { filename: input.filename, totalRows: lines.length - 1, successRows, errorRows: errors.length },
    });

    return toCsvJobDto(finalJob);
  }

  async getImportJob(id: string): Promise<CsvImportJobDto> {
    const job = await this.prisma.csvImportJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundError('ImportJob', id);
    return toCsvJobDto(job);
  }

  private async detectHierarchyCycle(startId: string, targetId: string): Promise<void> {
    const visited = new Set<string>();
    let current: string | null = startId;

    while (current) {
      if (visited.has(current)) break;
      visited.add(current);

      if (current === targetId) {
        throw new ValidationError('Atribuição criaria um ciclo na hierarquia de gestores');
      }

      const node: { managerId: string | null } | null = await this.prisma.user.findUnique({
        where: { id: current },
        select: { managerId: true },
      });

      current = node?.managerId ?? null;
    }
  }
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function generateTempPassword(): string {
  return `Temp@${Math.random().toString(36).slice(2, 10)}`;
}

function toCsvJobDto(job: {
  id: string; filename: string; status: string; totalRows: number;
  successRows: number; errorRows: number; errorReport: unknown;
  createdAt: Date; finishedAt: Date | null;
}): CsvImportJobDto {
  return {
    id: job.id,
    filename: job.filename,
    status: job.status,
    totalRows: job.totalRows,
    successRows: job.successRows,
    errorRows: job.errorRows,
    errorReport: job.errorReport,
    createdAt: job.createdAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}
