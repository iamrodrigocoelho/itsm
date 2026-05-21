# ITSM — Venancio

Ferramenta interna de **IT Service Management** com integração à **API CASI** da Conexão Tech. Colaboradores abrem chamados via catálogo de serviços, com workflow de aprovação pelo gestor direto e execução automática da alteração no CASI.

**Catálogo V1:** Alteração de filial (loja) do usuário.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2+ |
| Node.js *(dev local)* | 20 LTS |
| pnpm *(dev local)* | 9+ |

---

## Rodar localmente com Docker

```bash
# 1. Clone
git clone <url-do-repo> itsm-venancio
cd itsm-venancio

# 2. Copie e edite o arquivo de variáveis
cp infra/env/.env.example .env
# Preencha: DB_PASSWORD, REDIS_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# As demais variáveis (CASI, SMTP) podem ficar em branco no Sprint 0

# 3. Suba todos os serviços
docker compose -f infra/docker-compose.yml --env-file .env up -d

# 4. Acompanhe os logs
docker compose -f infra/docker-compose.yml logs -f backend
```

Na primeira subida o container `backend` roda `prisma migrate deploy` + `prisma db seed` automaticamente.
O usuário Admin inicial e sua senha temporária são exibidos nos logs do `backend`.

### Serviços disponíveis

| Serviço | URL (dev) |
|---|---|
| Frontend | `http://localhost` |
| API (via NGINX) | `http://localhost/api` |
| Swagger / OpenAPI | `http://localhost/api/api-docs` |
| Health check | `http://localhost/health` |
| Styleguide | `http://localhost/styleguide` |

---

## Desenvolvimento local (sem Docker)

```bash
# Instalar dependências de todos os workspaces
pnpm install

# Subir apenas o banco e Redis via Docker
docker compose -f infra/docker-compose.yml up -d postgres redis

# Backend
cp infra/env/.env.example apps/backend/.env
# Edite apps/backend/.env com DATABASE_URL e REDIS_URL apontando para localhost
pnpm --filter @itsm/backend db:migrate
pnpm --filter @itsm/backend db:seed
pnpm --filter @itsm/backend dev

# Frontend (em outro terminal)
pnpm --filter @itsm/frontend dev
# Acesse: http://localhost:5173
# Acesse o styleguide: http://localhost:5173/styleguide
```

---

## Testes

```bash
# Backend — unit (vitest)
pnpm --filter @itsm/backend test

# Backend — com cobertura (≥ 70% obrigatório)
pnpm --filter @itsm/backend test:coverage

# Typecheck em todos os workspaces
pnpm -r typecheck

# Lint
pnpm -r lint
```

---

## Variáveis de ambiente

O template completo está em `infra/env/.env.example`. Grupos principais:

| Grupo | Variáveis-chave |
|---|---|
| **Database** | `DB_USER`, `DB_PASSWORD`, `DATABASE_URL` |
| **Redis** | `REDIS_PASSWORD`, `REDIS_URL` |
| **JWT** | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` |
| **SMTP** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_TLS` |
| **CASI** | `CASI_BASE_URL`, `CASI_TENANT_ID`, `CASI_CLIENT_ID`, `CASI_CLIENT_SECRET`, `CASI_SCOPE`, `CASI_AUTH_KEY_REST_API`, `CASI_SUBSCRIPTION_KEY` |
| **App** | `APP_BASE_URL`, `APP_PORT`, `LOG_LEVEL`, `NODE_ENV` |
| **Seed** | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_MATRICULA`, `SEED_ADMIN_NOME` |

> **Nunca commite o `.env`.** Em produção use um cofre de segredos (ex: Vault, AWS Secrets Manager, variáveis do orquestrador).

---

## Estrutura do repositório

```
itsm-venancio/
├── apps/
│   ├── backend/              # API Fastify + workers BullMQ
│   │   ├── prisma/           # Schema Prisma + migrations + seed
│   │   ├── src/
│   │   │   ├── modules/      # auth, users, tickets, approvals…
│   │   │   ├── workers/      # BullMQ workers (Sprint 4)
│   │   │   └── shared/       # config, middleware, errors, utils
│   │   └── tests/
│   └── frontend/             # SPA React + Vite
│       └── src/
│           ├── pages/        # LoginPage, StyleguidePage, …
│           ├── components/   # UI components (Sprints 2+)
│           ├── features/     # feature slices (Sprints 2+)
│           ├── hooks/        # useAuth, …
│           ├── lib/          # api.ts, utils.ts
│           └── routes/       # React Router config
├── packages/
│   └── shared-types/         # Enums e DTOs compartilhados
├── infra/
│   ├── docker-compose.yml    # Dev
│   ├── docker-compose.prod.yml # Prod (TLS 443)
│   ├── nginx/                # nginx.conf + nginx.prod.conf
│   └── env/.env.example
├── docs/
│   ├── PRD.md                # O QUE construir
│   └── DESIGN.md             # COMO deve parecer (fonte da verdade visual)
└── .github/workflows/ci.yml  # Lint + testes
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 20 LTS · TypeScript strict · Fastify · Prisma · Zod |
| Banco | PostgreSQL 16 |
| Cache / Filas | Redis 7 · BullMQ |
| Frontend | React 18 · Vite · TypeScript · TanStack Query · Tailwind CSS |
| Design System | Tokens do `docs/DESIGN.md` via `tailwind.config.ts` |
| Auth | JWT (access 1h + refresh 8h) · bcrypt cost 12 |
| Observabilidade | Pino (logs JSON) · `/health` · `/ready` · `/metrics` |
| Testes | Vitest · Supertest |
| Infra | Docker · Docker Compose · NGINX |

---

## Styleguide visual

```
http://localhost:5173/styleguide   (dev — sem login)
http://localhost/styleguide        (docker — sem login em dev, Admin em prod)
```

Renderiza todos os componentes e tokens do `docs/DESIGN.md` como referência viva. Use ao construir qualquer componente novo.

---

## Contribuindo

1. Branch a partir de `main`: `feat/...`, `fix/...`, `chore/...`
2. Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/)
3. Antes de abrir PR:
   ```bash
   pnpm -r typecheck
   pnpm -r lint
   pnpm --filter @itsm/backend test:coverage
   ```
4. Mudanças visuais exigem print + validação contra `docs/DESIGN.md`
5. **Zero valores hardcoded** em componentes (sem `#fff`, sem `12px`, sem `text-blue-500`)

---

## Roadmap de Sprints

| Sprint | Entrega |
|---|---|
| **0 — Setup** ✅ | Monorepo · Docker · Schema · Auth · Tailwind tokens · Styleguide |
| **1 — Usuários** | CRUD · hierarquia · importação CSV |
| **2 — Catálogo e Ticket** | Catálogo "Alteração de Loja" · formulário · listagem |
| **3 — Aprovação** | Workflow gestor · transições · e-mails |
| **4 — CASI** | Worker BullMQ · OAuth2 · retry · circuit breaker |
| **5 — Dashboard** | KPIs · gráficos Recharts · exportação |
| **6 — Polimento** | Templates de e-mail · UX · E2E tests |
| **7 — Hardening** | Load test · pentest · deploy homologação |

Ver detalhes em `docs/PRD.md` Seção 7.
