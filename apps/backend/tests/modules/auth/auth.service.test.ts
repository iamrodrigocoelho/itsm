import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthService } from '../../../src/modules/auth/auth.service.js';
import { UnauthorizedError, TooManyRequestsError, ValidationError } from '../../../src/shared/errors/AppError.js';

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
};

// Redis is mocked globally in tests/setup.ts
// We need a local ref to control return values per test
const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
};

vi.mock('../../../src/shared/utils/redis.js', () => ({
  getRedis: () => mockRedis,
  closeRedis: vi.fn(),
}));

const MOCK_USER = {
  id: 'user-id-123',
  matricula: '000001',
  nome: 'Fulano Teste',
  email: 'fulano@empresa.com.br',
  passwordHash: bcrypt.hashSync('Senha@123', 10),
  role: 'COLABORADOR',
  status: 'ATIVO',
  codDominio: 1,
  codEmpresa: 1,
  codLojaAtual: 10,
  lockedUntil: null,
  mustChangePassword: false,
  failedLoginCount: 0,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockPrisma as never);
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(1);
  });

  describe('login', () => {
    it('returns tokens and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.update.mockResolvedValue(MOCK_USER);

      const result = await service.login({ email: 'fulano@empresa.com.br', password: 'Senha@123' }, '127.0.0.1');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('fulano@empresa.com.br');
      expect(result.user.role).toBe('COLABORADOR');
    });

    it('throws UnauthorizedError on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await expect(
        service.login({ email: 'fulano@empresa.com.br', password: 'WrongPassword' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@empresa.com.br', password: 'Senha@123' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws TooManyRequestsError when failed attempts >= 5', async () => {
      mockRedis.get.mockResolvedValue('5');

      await expect(
        service.login({ email: 'fulano@empresa.com.br', password: 'Senha@123' }, '127.0.0.1'),
      ).rejects.toThrow(TooManyRequestsError);
    });

    it('throws ForbiddenError for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, status: 'INATIVO' });

      await expect(
        service.login({ email: 'fulano@empresa.com.br', password: 'Senha@123' }, '127.0.0.1'),
      ).rejects.toThrow('Conta inativa');
    });

    it('increments failed login counter on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      try {
        await service.login({ email: 'fulano@empresa.com.br', password: 'Wrong' }, '127.0.0.1');
      } catch {
        // expected
      }

      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('clears failed counter on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.update.mockResolvedValue(MOCK_USER);

      await service.login({ email: 'fulano@empresa.com.br', password: 'Senha@123' }, '127.0.0.1');

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes refresh token from Redis', async () => {
      await service.logout('user-id-123', 'some-refresh-token-here');
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('throws ValidationError when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await expect(
        service.changePassword('user-id-123', {
          currentPassword: 'WrongCurrent',
          newPassword: 'NewPass@123',
          confirmPassword: 'NewPass@123',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when new password equals current', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await expect(
        service.changePassword('user-id-123', {
          currentPassword: 'Senha@123',
          newPassword: 'Senha@123',
          confirmPassword: 'Senha@123',
        }),
      ).rejects.toThrow('não pode ser igual');
    });

    it('updates password hash on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.update.mockResolvedValue({ ...MOCK_USER });

      await service.changePassword('user-id-123', {
        currentPassword: 'Senha@123',
        newPassword: 'NewPass@456',
        confirmPassword: 'NewPass@456',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id-123' },
          data: expect.objectContaining({ mustChangePassword: false }),
        }),
      );
    });
  });
});
