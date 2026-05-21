import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    jwtUser: JwtPayload;
  }
}

export function authenticate() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    try {
      const payload = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET) as JwtPayload;
      if (payload.type !== 'access') throw new UnauthorizedError('Token inválido');
      request.jwtUser = payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  };
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    try {
      const payload = jwt.verify(authHeader.slice(7), env.JWT_ACCESS_SECRET) as JwtPayload;
      if (payload.type !== 'access') throw new UnauthorizedError('Token inválido');
      request.jwtUser = payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Token inválido ou expirado');
    }

    if (roles.length > 0 && !roles.includes(request.jwtUser.role)) {
      throw new ForbiddenError('Acesso não autorizado para este perfil');
    }
  };
}
