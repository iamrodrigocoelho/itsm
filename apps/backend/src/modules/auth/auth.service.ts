import bcrypt from 'bcrypt';
import jwt, { type JwtPayload as JwtBasePayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../../shared/config/env.js';
import { getRedis } from '../../shared/utils/redis.js';
import {
  UnauthorizedError,
  TooManyRequestsError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors/AppError.js';
import type { LoginInput, RefreshInput, ChangePasswordInput } from './auth.schemas.js';
import type { UserSummaryDto, LoginResponseDto, RefreshResponseDto } from '@itsm/shared-types';
import { AuditService } from '../../shared/services/audit.service.js';

const FAILED_LOGIN_MAX = 5;
const FAILED_LOGIN_WINDOW_SEC = 15 * 60; // 15 min
const ACCOUNT_LOCK_SEC = 30 * 60;        // 30 min
const REFRESH_TOKEN_PREFIX = 'refresh:';
const FAILED_LOGIN_PREFIX = 'failed_login:';
const BCRYPT_ROUNDS = 12;

interface JwtPayload extends JwtBasePayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

function signAccessToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL },
  );
}

function signRefreshToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_TTL },
  );
}

function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

function toUserSummary(user: {
  id: string; matricula: string; nome: string; email: string;
  role: string; status: string; codDominio: number; codEmpresa: number; codLojaAtual: number;
  mustChangePassword: boolean;
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

export class AuthService {
  private readonly audit: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.audit = new AuditService(prisma);
  }

  async login(input: LoginInput, ip: string): Promise<LoginResponseDto> {
    const redis = getRedis();
    const lockKey = `${FAILED_LOGIN_PREFIX}${input.email}:${ip}`;

    // Check account lock
    const failedCount = await redis.get(lockKey);
    if (failedCount && parseInt(failedCount, 10) >= FAILED_LOGIN_MAX) {
      throw new TooManyRequestsError(
        'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em 30 minutos.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    const invalid = !user || !(await bcrypt.compare(input.password, user.passwordHash));

    if (invalid) {
      const newCount = await redis.incr(lockKey);
      if (newCount === 1) await redis.expire(lockKey, FAILED_LOGIN_WINDOW_SEC);
      if (newCount >= FAILED_LOGIN_MAX) {
        await redis.expire(lockKey, ACCOUNT_LOCK_SEC);
      }
      await this.audit.log({
        entityType: 'User',
        entityId: user?.id ?? 'unknown',
        action: 'LOGIN_FAILED',
        actorIp: ip,
        metadata: { email: input.email },
      });
      throw new UnauthorizedError('E-mail ou senha incorretos');
    }

    if (user.status === 'INATIVO') {
      throw new ForbiddenError('Conta inativa. Entre em contato com o administrador.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new TooManyRequestsError('Conta bloqueada. Tente novamente mais tarde.');
    }

    // Clear failed login counter on success
    await redis.del(lockKey);

    // Update lastLoginAt + reset failedLoginCount
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0 },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store refresh token in Redis with TTL
    await redis.setex(
      `${REFRESH_TOKEN_PREFIX}${user.id}:${refreshToken.slice(-16)}`,
      env.JWT_REFRESH_TTL,
      refreshToken,
    );

    await this.audit.log({
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      actorUserId: user.id,
      actorIp: ip,
    });

    return { accessToken, refreshToken, user: toUserSummary(user) };
  }

  async refresh(input: RefreshInput): Promise<RefreshResponseDto> {
    const payload = verifyRefreshToken(input.refreshToken);

    if (payload.type !== 'refresh') throw new UnauthorizedError('Token inválido');

    const redis = getRedis();
    const key = `${REFRESH_TOKEN_PREFIX}${payload.sub}:${input.refreshToken.slice(-16)}`;
    const stored = await redis.get(key);

    if (!stored || stored !== input.refreshToken) {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'INATIVO') throw new UnauthorizedError('Usuário não encontrado');

    // Rotate: delete old, issue new
    await redis.del(key);

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await redis.setex(
      `${REFRESH_TOKEN_PREFIX}${user.id}:${newRefreshToken.slice(-16)}`,
      env.JWT_REFRESH_TTL,
      newRefreshToken,
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshToken: string, ip?: string): Promise<void> {
    const redis = getRedis();
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${refreshToken.slice(-16)}`;
    await redis.del(key);
    await this.audit.log({
      entityType: 'User',
      entityId: userId,
      action: 'LOGOUT',
      actorUserId: userId,
      actorIp: ip,
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError();

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError('Senha atual incorreta');

    if (input.currentPassword === input.newPassword) {
      throw new ValidationError('A nova senha não pode ser igual à senha atual');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false },
    });
  }
}
