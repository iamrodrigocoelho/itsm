import { env } from '../../../shared/config/env.js';
import { logger } from '../../../shared/utils/logger.js';
import { getRedis } from '../../../shared/utils/redis.js';

const TOKEN_CACHE_KEY = 'casi:oauth_token';
const TOKEN_TTL_SECONDS = 3300; // 55 min — token expira em 1h

export interface Loja {
  codLoja: number;
  nomeLoja: string;
}

export interface ControleAcesso {
  codGrupo: number;
  codEmpresa: number;
  codLoja: number;
  codSistema: number;
}

export interface UsuarioCasi {
  codDominio: number;
  numMatricula: number;
  nome: string;
  email: string;
  controleAcesso: ControleAcesso[];
  autenticacaoLocal: unknown;
}

export interface AlterarLojaInput {
  codDominio: number;
  numMatricula: number;
  nome: string;
  email: string;
  codLojaNova: number;
  controleAcessoAtual: ControleAcesso[];
  autenticacaoLocal: unknown;
}

export interface AlterarLojaResult {
  sucesso: boolean;
  qtdeRegAlterados: number;
  rawResponse: unknown;
}

const TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getToken(): Promise<string> {
  const redis = getRedis();
  const cached = await redis.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const tokenUrl = `https://login.microsoftonline.com/${env.CASI_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.CASI_CLIENT_ID,
    client_secret: env.CASI_CLIENT_SECRET,
    scope: env.CASI_SCOPE,
  });

  logger.info({ url: tokenUrl, client_id: env.CASI_CLIENT_ID }, 'CASI: requesting OAuth2 token');

  const res = await fetchWithTimeout(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text }, 'CASI: failed to obtain OAuth2 token');
    throw new Error(`CASI token request failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  await redis.set(TOKEN_CACHE_KEY, json.access_token, 'EX', TOKEN_TTL_SECONDS);

  logger.info('CASI: OAuth2 token obtained and cached');
  return json.access_token;
}

async function invalidateToken(): Promise<void> {
  await getRedis().del(TOKEN_CACHE_KEY);
}

function casiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    auth_key_rest_api: env.CASI_AUTH_KEY_REST_API,
    'Ocp-Apim-Subscription-Key': env.CASI_SUBSCRIPTION_KEY,
    'Content-Type': 'application/json',
  };
}

async function withTokenRefreshOn401<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getToken();
  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof CasiHttpError && err.status === 401) {
      logger.warn('CASI: 401 received, invalidating token and retrying');
      await invalidateToken();
      const freshToken = await getToken();
      return fn(freshToken);
    }
    throw err;
  }
}

class CasiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'CasiHttpError';
  }
}

export const casiClient = {
  async listarLojas(codDominio: number, codEmpresa: number): Promise<Loja[]> {
    return withTokenRefreshOn401(async (token) => {
      const url = `${env.CASI_BASE_URL}/api/lojas/${codDominio}/${codEmpresa}`;
      logger.info({ url }, 'CASI: listarLojas');

      const res = await fetchWithTimeout(url, { headers: casiHeaders(token) });
      const body = await res.json() as unknown;

      if (!res.ok) {
        throw new CasiHttpError(res.status, body, `CASI listarLojas HTTP ${res.status}`);
      }
      return body as Loja[];
    });
  },

  async consultarUsuario(codDominio: number, numMatricula: number): Promise<UsuarioCasi> {
    return withTokenRefreshOn401(async (token) => {
      const url = `${env.CASI_BASE_URL}/controle-acesso-usuarios/consultar`;
      const payload = { codDominio, numerosMatricula: [numMatricula] };

      logger.info({ url, codDominio, numMatricula }, 'CASI: consultarUsuario');

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: casiHeaders(token),
        body: JSON.stringify(payload),
      });
      const body = await res.json() as unknown;

      if (!res.ok) {
        throw new CasiHttpError(res.status, body, `CASI consultarUsuario HTTP ${res.status}`);
      }

      const data = body as { usuarios: UsuarioCasi[] };
      const usuario = data.usuarios?.[0];
      if (!usuario) {
        throw new Error(`CASI: usuário ${numMatricula} não encontrado na resposta`);
      }
      return usuario;
    });
  },

  async alterarLojaDoUsuario(input: AlterarLojaInput): Promise<AlterarLojaResult> {
    return withTokenRefreshOn401(async (token) => {
      const url = `${env.CASI_BASE_URL}/controle-acesso-usuarios/alterar`;

      const controleAcessoAtualizado = input.controleAcessoAtual.map((ca) => ({
        ...ca,
        codLoja: input.codLojaNova,
      }));

      const payload = {
        usuarios: [
          {
            codDominio: input.codDominio,
            numMatricula: input.numMatricula,
            nome: input.nome,
            email: input.email,
            controleAcesso: controleAcessoAtualizado,
            autenticacaoLocal: input.autenticacaoLocal,
          },
        ],
      };

      logger.info(
        { url, numMatricula: input.numMatricula, codLojaNova: input.codLojaNova },
        'CASI: alterarLojaDoUsuario',
      );

      const res = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: casiHeaders(token),
        body: JSON.stringify(payload),
      });
      const body = await res.json() as unknown;

      logger.info(
        { status: res.status, numMatricula: input.numMatricula },
        'CASI: alterarLojaDoUsuario response',
      );

      if (!res.ok) {
        throw new CasiHttpError(res.status, body, `CASI alterarLojaDoUsuario HTTP ${res.status}`);
      }

      const data = body as { codigoHTTP?: number; qtdeRegAlterados?: number; usuarios?: Array<{ erros?: string[] }> };

      // Validar erros dentro do corpo da resposta
      const errosInterno = data.usuarios?.[0]?.erros ?? [];
      if (errosInterno.length > 0) {
        throw new CasiHttpError(res.status, body, `CASI: erros internos: ${errosInterno.join('; ')}`);
      }

      const qtde = data.qtdeRegAlterados ?? 0;
      return {
        sucesso: (res.status === 200 || res.status === 201) && qtde >= 1,
        qtdeRegAlterados: qtde,
        rawResponse: body,
      };
    });
  },
};
