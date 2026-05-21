import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../../../src/modules/users/users.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../src/shared/errors/AppError.js';

// Prisma mock
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  csvImportJob: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

const ACTOR_ID = 'actor-uuid-1234';
const ACTOR_IP = '127.0.0.1';

interface UserMock {
  id: string; matricula: string; nome: string; email: string;
  passwordHash: string; role: string; status: string;
  codDominio: number; codEmpresa: number; codLojaAtual: number;
  cpf: string | null; telefone: string | null;
  managerId: string | null; manager: { nome: string } | null;
  mustChangePassword: boolean;
  createdAt: Date; updatedAt: Date; lastLoginAt: Date | null;
  passwordChangedAt: Date | null; failedLoginCount: number; lockedUntil: Date | null;
}

function makeUser(overrides: Partial<UserMock> = {}): UserMock {
  return {
    id: 'user-uuid-1',
    matricula: '000001',
    nome: 'João Silva',
    email: 'joao@example.com',
    passwordHash: '$2b$12$hash',
    role: 'COLABORADOR',
    status: 'ATIVO',
    codDominio: 1,
    codEmpresa: 1,
    codLojaAtual: 1,
    cpf: null,
    telefone: null,
    managerId: null,
    manager: null,
    mustChangePassword: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastLoginAt: null,
    passwordChangedAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(mockPrisma as never);
  });

  // ── list ─────────────────────────────────────────────────────────────────────
  describe('list', () => {
    it('returns paginated users', async () => {
      const users = [makeUser()];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies search filter to query', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.list({ page: 1, limit: 20, search: 'João' });

      const callArg = mockPrisma.user.findMany.mock.calls[0]?.[0];
      expect(callArg?.where).toHaveProperty('OR');
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('returns user detail when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.getById('user-uuid-1');

      expect(result.id).toBe('user-uuid-1');
      expect(result.nome).toBe('João Silva');
    });

    it('throws NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────
  describe('create', () => {
    const input = {
      matricula: '000002',
      nome: 'Maria Santos',
      email: 'maria@example.com',
      password: 'Senha@123',
      role: 'COLABORADOR' as const,
      codDominio: 1,
      codEmpresa: 1,
      codLojaAtual: 2,
    };

    it('creates user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // no conflicts
      const created = makeUser({ matricula: '000002', nome: 'Maria Santos', email: 'maria@example.com' });
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.create(input, ACTOR_ID, ACTOR_IP);

      expect(result.matricula).toBe('000002');
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('throws ConflictError when email already exists', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(makeUser()) // email exists
        .mockResolvedValueOnce(null);      // matricula

      await expect(service.create(input, ACTOR_ID)).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError when matricula already exists', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)       // email ok
        .mockResolvedValueOnce(makeUser()); // matricula exists

      await expect(service.create(input, ACTOR_ID)).rejects.toThrow(ConflictError);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates user fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser({ nome: 'João Atualizado' }));

      const result = await service.update('user-uuid-1', { nome: 'João Atualizado' }, ACTOR_ID);

      expect(result.nome).toBe('João Atualizado');
    });

    it('throws NotFoundError when updating nonexistent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { nome: 'X' }, ACTOR_ID)).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when new email is taken', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(makeUser())                           // existing user
        .mockResolvedValueOnce(makeUser({ id: 'other-id' }));        // email conflict

      await expect(service.update('user-uuid-1', { email: 'taken@email.com' }, ACTOR_ID)).rejects.toThrow(ConflictError);
    });
  });

  // ── softDelete ────────────────────────────────────────────────────────────────
  describe('softDelete', () => {
    it('sets status to INATIVO', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser({ status: 'INATIVO' }));

      await service.softDelete('user-uuid-1', ACTOR_ID);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'INATIVO' } }),
      );
    });

    it('throws NotFoundError for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent', ACTOR_ID)).rejects.toThrow(NotFoundError);
    });
  });

  // ── setManager ────────────────────────────────────────────────────────────────
  describe('setManager', () => {
    it('sets manager successfully', async () => {
      const user = makeUser({ id: 'user-1' });
      const manager = makeUser({ id: 'manager-1', managerId: null });

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user)    // user lookup
        .mockResolvedValueOnce(manager) // manager lookup
        .mockResolvedValueOnce(null);   // cycle check: manager has no manager

      mockPrisma.user.update.mockResolvedValue({ ...user, managerId: 'manager-1', manager: { nome: 'Gestor' } });

      const result = await service.setManager('user-1', 'manager-1', ACTOR_ID);

      expect(result.managerId).toBe('manager-1');
    });

    it('throws ValidationError when setting self as manager', async () => {
      await expect(service.setManager('user-1', 'user-1', ACTOR_ID)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when assignment creates a cycle', async () => {
      // user-A → manager-B → manager-A (cycle if we set A's manager to B and B's manager is A)
      // setManager(userId='user-B', managerId='user-A') where user-A's manager is user-B
      const userB = makeUser({ id: 'user-B', managerId: null });
      const userA = makeUser({ id: 'user-A', managerId: 'user-B' }); // A's manager is B

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(userB) // user lookup (userId=user-B)
        .mockResolvedValueOnce(userA) // manager lookup (managerId=user-A)
        // cycle detection: walk from user-A upward
        .mockResolvedValueOnce({ managerId: 'user-B' }); // user-A's manager is user-B = target → cycle!

      await expect(service.setManager('user-B', 'user-A', ACTOR_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ── importCsv ─────────────────────────────────────────────────────────────────
  describe('importCsv', () => {
    const validCsv = [
      'matricula,nome,email,codDominio,codEmpresa,codLojaAtual',
      '000010,Ana Lima,ana@example.com,1,1,5',
    ].join('\n');

    it('creates users from CSV', async () => {
      mockPrisma.csvImportJob.create.mockResolvedValue({
        id: 'job-1', filename: 'import.csv', status: 'PROCESSING',
        totalRows: 1, successRows: 0, errorRows: 0, errorReport: null,
        createdAt: new Date(), finishedAt: null, uploadedBy: ACTOR_ID,
      });
      mockPrisma.user.findUnique.mockResolvedValue(null); // no existing user
      mockPrisma.user.create.mockResolvedValue(makeUser({ matricula: '000010' }));
      mockPrisma.csvImportJob.update.mockResolvedValue({
        id: 'job-1', filename: 'import.csv', status: 'COMPLETED',
        totalRows: 1, successRows: 1, errorRows: 0, errorReport: null,
        createdAt: new Date(), finishedAt: new Date(), uploadedBy: ACTOR_ID,
      });

      const result = await service.importCsv({ filename: 'import.csv', content: validCsv }, ACTOR_ID);

      expect(result.status).toBe('COMPLETED');
      expect(result.successRows).toBe(1);
    });

    it('throws ValidationError when CSV has no header', async () => {
      await expect(
        service.importCsv({ filename: 'bad.csv', content: '' }, ACTOR_ID),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when CSV exceeds 500 lines', async () => {
      const header = 'matricula,nome,email,codDominio,codEmpresa,codLojaAtual';
      const rows = Array.from({ length: 501 }, (_, i) => `M${i},Nome,e${i}@x.com,1,1,1`);
      const content = [header, ...rows].join('\n');

      await expect(
        service.importCsv({ filename: 'big.csv', content }, ACTOR_ID),
      ).rejects.toThrow(ValidationError);
    });
  });
});
