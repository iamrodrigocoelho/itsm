import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../../../src/shared/services/audit.service.js';

const mockPrisma = {
  auditLog: {
    create: vi.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService(mockPrisma as never);
  });

  it('creates an audit log entry', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({});

    await service.log({
      entityType: 'User',
      entityId: 'user-1',
      action: 'LOGIN',
      actorUserId: 'user-1',
      actorIp: '127.0.0.1',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'User',
          entityId: 'user-1',
          action: 'LOGIN',
          actorUserId: 'user-1',
          actorIp: '127.0.0.1',
        }),
      }),
    );
  });

  it('logs CREATE action with afterValue', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({});

    await service.log({
      entityType: 'User',
      entityId: 'user-2',
      action: 'CREATE',
      actorUserId: 'admin-1',
      afterValue: { email: 'new@example.com' },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          afterValue: { email: 'new@example.com' },
        }),
      }),
    );
  });

  it('does not throw when database write fails (fire-and-forget)', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('DB down'));

    await expect(
      service.log({ entityType: 'User', entityId: 'u1', action: 'LOGIN' }),
    ).resolves.toBeUndefined();
  });

  it('handles null actorUserId gracefully', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({});

    await service.log({
      entityType: 'User',
      entityId: 'user-3',
      action: 'LOGIN_FAILED',
      actorUserId: null,
      metadata: { email: 'unknown@test.com' },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorUserId: null }),
      }),
    );
  });
});
