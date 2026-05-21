# PRD — Sistema ITSM com Integração CASI API

**Versão:** 1.1
**Data:** 20/05/2026
**Autor:** Time de TI
**Status:** Aprovado para desenvolvimento

**Documentos relacionados:**
- [`docs/DESIGN.md`](./DESIGN.md) — Design System (identidade visual, paleta de cores, tipografia, componentes UI). **Leitura obrigatória para qualquer trabalho de frontend.**

> Toda decisão de UI deste PRD deve respeitar rigorosamente o que está em `docs/DESIGN.md`. Em caso de divergência entre este documento e o DESIGN.md no que se refere a aparência, tokens, componentes ou comportamento visual, **o DESIGN.md prevalece**.

---

## 1. Visão Geral

### 1.1 Objetivo do Produto
Desenvolver uma ferramenta de **IT Service Management (ITSM)** corporativa que permita aos colaboradores abrirem chamados estruturados através de um catálogo de serviços. O primeiro catálogo a ser implementado é o de **"Alteração de Filial (Loja) do Usuário"**, que após aprovação do gestor direto, executa automaticamente a alteração via integração com a **API CASI da Conexão Tech**.

### 1.2 Problema a Resolver
Hoje, alterações de loja vinculadas a usuários no CASI são feitas manualmente pelo time de TI/Suporte, gerando:
- Falta de rastreabilidade (sem trilha de auditoria estruturada).
- Ausência de workflow formal de aprovação pelo gestor.
- Demora no atendimento e retrabalho da equipe técnica.
- Risco de alteração indevida sem aprovação formal.

### 1.3 Solução Proposta
Uma aplicação web interna (rede corporativa) que:
1. Permite ao colaborador abrir um chamado de "Alteração de Loja" via formulário.
2. Envia o chamado automaticamente para aprovação do gestor cadastrado.
3. Após aprovação, integra-se com a API CASI para efetivar a alteração.
4. Encerra o chamado automaticamente após retorno de sucesso da API.
5. Mantém histórico completo e auditável de todas as ações.

### 1.4 Escopo da V1 (MVP)
**Dentro do escopo:**
- Catálogo de serviço: "Alteração de Loja do Usuário".
- Autenticação local (usuário/senha) com hash seguro.
- Cadastro manual de hierarquia gestor ↔ colaborador.
- Importação de hierarquia via CSV.
- Workflow de aprovação em uma etapa (gestor direto).
- Integração com API CASI (autenticação OAuth2 Azure + endpoints de usuário).
- Notificações por e-mail em todas as transições de status.
- Dashboard executivo + listagem detalhada com filtros.
- Trilha de auditoria completa com timestamps.
- Arquitetura preparada para múltiplos catálogos futuros.

**Fora do escopo da V1:**
- SSO via AD/Azure AD (planejado para V2).
- Outros catálogos de serviço (mas estrutura genérica deve estar pronta).
- Escalonamento automático de SLA.
- Aplicativo mobile nativo.
- Integração com outras APIs além do CASI.

---

## 2. Stakeholders e Perfis de Usuário

### 2.1 Perfis (Roles)

| Perfil | Descrição | Permissões Principais |
|---|---|---|
| **Colaborador** | Funcionário comum que abre chamados | Criar chamados, acompanhar status dos próprios chamados, cancelar chamados próprios em status "Aguardando Aprovação" |
| **Gestor** | Líder de equipe | Todas as permissões de Colaborador + aprovar/rejeitar chamados de seus liderados, ver chamados da sua equipe |
| **Analista TI** | Suporte técnico | Ver todos os chamados, intervir manualmente em chamados com falha de integração, reprocessar chamados, ver logs técnicos |
| **Auditor** | Compliance/Auditoria | Acesso somente leitura a todos os chamados, exportar relatórios e trilha de auditoria |
| **Administrador** | Admin do sistema | Tudo acima + gestão de usuários, hierarquia, configurações, parâmetros de integração, importação CSV |

### 2.2 Matriz de Permissões (RBAC)

| Ação | Colab. | Gestor | Analista | Auditor | Admin |
|---|---|---|---|---|---|
| Criar chamado próprio | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ver chamados próprios | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancelar chamado próprio (status aberto) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Aprovar/rejeitar chamado de liderado | ❌ | ✅ | ❌ | ❌ | ✅ |
| Ver chamados da equipe | ❌ | ✅ | ❌ | ❌ | ✅ |
| Ver todos os chamados | ❌ | ❌ | ✅ | ✅ | ✅ |
| Reprocessar chamado com falha | ❌ | ❌ | ✅ | ❌ | ✅ |
| Exportar relatórios CSV | ❌ | ✅ (equipe) | ✅ | ✅ | ✅ |
| Acessar dashboard executivo | ❌ | ✅ (equipe) | ✅ | ✅ | ✅ |
| Gerenciar usuários e hierarquia | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configurar parâmetros do sistema | ❌ | ❌ | ❌ | ❌ | ✅ |
| Importar CSV de hierarquia | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver trilha de auditoria | ❌ | ✅ (equipe) | ✅ | ✅ | ✅ |

---

## 3. Requisitos Funcionais

### 3.1 RF-01 — Autenticação e Sessão
- **RF-01.1** Login com usuário (matrícula ou e-mail corporativo) e senha.
- **RF-01.2** Senhas armazenadas com hash bcrypt (cost factor mínimo 12).
- **RF-01.3** Sessão via JWT (access token 1h + refresh token 8h).
- **RF-01.4** Logout invalidando o refresh token (lista negra em Redis ou tabela).
- **RF-01.5** Bloqueio de conta após 5 tentativas de login inválidas em 15 min (desbloqueio automático após 30 min ou manual pelo admin).
- **RF-01.6** Política de senha: mínimo 8 caracteres, ao menos 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.
- **RF-01.7** Forçar troca de senha no primeiro acesso e a cada 90 dias.
- **RF-01.8** Recuperação de senha via e-mail (token de uso único, válido 30 min).
- **RF-01.9** **[Preparação V2]** Interface de autenticação abstraída para permitir plug-in de SSO (AD/Azure AD) sem refatoração da camada de negócio.

### 3.2 RF-02 — Gestão de Usuários e Hierarquia
- **RF-02.1** CRUD de usuários (somente Admin).
- **RF-02.2** Campos do usuário: matrícula, nome completo, e-mail, CPF (opcional), telefone, perfil (role), status (ativo/inativo), gestor direto, codDominio/codEmpresa/codLoja atuais (espelho do CASI), data de criação, data de última atualização.
- **RF-02.3** Cadastro manual da relação gestor ↔ colaborador.
- **RF-02.4** Validação que impede ciclos hierárquicos (A é gestor de B que é gestor de A).
- **RF-02.5** Importação em massa via CSV com as colunas: `matricula,nome,email,matricula_gestor,perfil,codDominio,codEmpresa,codLoja_atual`.
  - Validação de cabeçalho.
  - Relatório de linhas processadas com sucesso e linhas com erro (download).
  - Modo "atualizar existentes" (UPSERT por matrícula).
- **RF-02.6** Histórico de mudanças hierárquicas (quem mudou gestor de quem e quando).

### 3.3 RF-03 — Catálogo de Serviços (Estrutura Genérica)
- **RF-03.1** Entidade `ServiceCatalog` com: id, nome, descrição, categoria, ícone, ativo (boolean), formulário dinâmico (JSON Schema), workflow de aprovação, integração associada.
- **RF-03.2** Apenas Admin pode criar/editar catálogos.
- **RF-03.3** Catálogo "Alteração de Loja" pré-cadastrado via seed/migration.
- **RF-03.4** Formulário dinâmico renderizado no frontend a partir do JSON Schema do catálogo.

### 3.4 RF-04 — Catálogo: Alteração de Loja do Usuário
- **RF-04.1** Formulário de abertura do chamado contém:
  - **Solicitante:** preenchido automaticamente com dados do usuário logado (read-only).
  - **Loja atual:** preenchida automaticamente (read-only, vem do cadastro do usuário).
  - **Nova loja desejada:** dropdown alimentado dinamicamente via `GET /api/lojas/{codDominio}/{codEmpresa}` da API CASI (com cache de 1h).
  - **Justificativa:** campo texto obrigatório, mínimo 20 caracteres, máximo 500.
  - **Data desejada para efetivação:** datepicker (opcional, padrão imediato).
- **RF-04.2** Ao submeter, o chamado entra no status **"Aguardando Aprovação"** e notifica o gestor por e-mail.
- **RF-04.3** O sistema valida que a nova loja é diferente da loja atual.
- **RF-04.4** O sistema valida que o solicitante tem um gestor cadastrado (caso contrário, exibe erro e notifica Admin).

### 3.5 RF-05 — Workflow de Aprovação
- **RF-05.1** Estados possíveis do chamado:
  | Status | Descrição |
  |---|---|
  | `RASCUNHO` | Em edição pelo solicitante (opcional, V1.1) |
  | `AGUARDANDO_APROVACAO` | Aguardando ação do gestor |
  | `APROVADO` | Gestor aprovou, fila para processamento na API CASI |
  | `EM_PROCESSAMENTO` | Worker está chamando a API CASI |
  | `CONCLUIDO` | Alteração efetivada com sucesso no CASI |
  | `REJEITADO` | Gestor rejeitou (com motivo) |
  | `CANCELADO` | Solicitante cancelou antes da aprovação |
  | `FALHA_INTEGRACAO` | API CASI retornou erro; aguarda intervenção do Analista TI |

- **RF-05.2** Transições permitidas:
  ```
  AGUARDANDO_APROVACAO → APROVADO | REJEITADO | CANCELADO
  APROVADO → EM_PROCESSAMENTO
  EM_PROCESSAMENTO → CONCLUIDO | FALHA_INTEGRACAO
  FALHA_INTEGRACAO → EM_PROCESSAMENTO (reprocessamento manual)
  ```
- **RF-05.3** Ao aprovar, o gestor pode adicionar um comentário (opcional).
- **RF-05.4** Ao rejeitar, o motivo é obrigatório (mínimo 20 caracteres).
- **RF-05.5** Após aprovação, o chamado entra em fila de processamento assíncrono (BullMQ + Redis).

### 3.6 RF-06 — Integração com API CASI
- **RF-06.1** Worker assíncrono consome a fila de chamados aprovados.
- **RF-06.2** Fluxo de chamada à API CASI:
  1. Obter token OAuth2 via `POST https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token` (cache do token por 55 min — token expira em 1h).
  2. Consultar usuário no CASI via `POST /controle-acesso-usuarios/consultar` com `codDominio` e `numerosMatricula` para obter o `controleAcesso` atual.
  3. Montar payload de alteração mantendo grupo/empresa/sistema atuais e trocando apenas `codLoja`.
  4. Chamar `PUT /controle-acesso-usuarios/alterar` com o payload atualizado.
  5. Em caso de sucesso (HTTP 201 e `qtdeRegAlterados >= 1`), marcar chamado como **CONCLUIDO** e atualizar o `codLoja` na tabela local de usuários.
  6. Em caso de erro, marcar como **FALHA_INTEGRACAO** e registrar a resposta completa da API no log do chamado.
- **RF-06.3** Headers obrigatórios em todas as chamadas:
  - `Authorization: Bearer {access_token}`
  - `auth_key_rest_api: {chave_fornecida}`
  - `Ocp-Apim-Subscription-Key: {subscription_key_fornecida}`
- **RF-06.4** Política de retentativa: 3 tentativas com backoff exponencial (10s, 30s, 90s) antes de marcar como FALHA_INTEGRACAO.
- **RF-06.5** Timeout de cada chamada HTTP: 30 segundos.
- **RF-06.6** Todas as chamadas e respostas devem ser logadas (sem expor senhas/tokens em texto plano).
- **RF-06.7** Credenciais da API CASI armazenadas em variáveis de ambiente / secret manager (nunca em código ou banco em texto plano).

### 3.7 RF-07 — Notificações por E-mail
- **RF-07.1** Eventos que disparam e-mail:
  | Evento | Destinatário(s) |
  |---|---|
  | Chamado aberto | Solicitante (confirmação) + Gestor (ação pendente) |
  | Chamado aprovado | Solicitante |
  | Chamado rejeitado | Solicitante (com motivo) |
  | Chamado concluído (CASI ok) | Solicitante + Gestor |
  | Falha de integração | Solicitante + Analistas TI |
  | Cancelado pelo solicitante | Gestor |
- **RF-07.2** Templates HTML com identidade visual da empresa (logotipo, cores).
- **RF-07.3** E-mails contêm link direto para o chamado no sistema.
- **RF-07.4** Configuração SMTP via variáveis de ambiente (host, porta, user, senha, TLS).
- **RF-07.5** Fila de e-mails (BullMQ) com retry em caso de falha (3 tentativas).
- **RF-07.6** Logs de envio (sucesso/falha) na trilha de auditoria.

### 3.8 RF-08 — Trilha de Auditoria
- **RF-08.1** Toda ação relevante deve gerar um registro na tabela `audit_log` com:
  - `id`, `entity_type` (ticket, user, hierarchy, etc.), `entity_id`, `action` (CREATE, UPDATE, APPROVE, REJECT, etc.), `actor_user_id`, `actor_ip`, `before_value` (JSON), `after_value` (JSON), `metadata` (JSON), `created_at`.
- **RF-08.2** Eventos auditados (mínimo):
  - Login/logout (sucesso e falha).
  - Criação/edição/exclusão de usuário.
  - Mudança de hierarquia.
  - Cada transição de status de chamado.
  - Chamadas à API CASI (request e response).
  - Importação de CSV (quem, quando, quantas linhas).
  - Mudanças de configuração do sistema.
- **RF-08.3** Auditoria imutável: sem UPDATE/DELETE nos registros (apenas INSERT).
- **RF-08.4** Retenção mínima: 5 anos.

### 3.9 RF-09 — Listagem e Filtros de Chamados
- **RF-09.1** Tela de listagem com paginação server-side (padrão 20 por página, máx 100).
- **RF-09.2** Filtros disponíveis:
  - Número do chamado.
  - Status (multi-seleção).
  - Catálogo de serviço.
  - Solicitante (autocomplete).
  - Gestor aprovador (autocomplete).
  - Loja origem / Loja destino.
  - Data de abertura (range).
  - Data de conclusão (range).
- **RF-09.3** Ordenação por: data de abertura, data de conclusão, status, solicitante.
- **RF-09.4** Exportação CSV/Excel da listagem filtrada (assíncrona para volumes grandes, com download via link de e-mail).
- **RF-09.5** Visão padrão por perfil:
  - Colaborador: apenas seus chamados.
  - Gestor: chamados próprios + da equipe.
  - Analista/Auditor/Admin: todos.

### 3.10 RF-10 — Dashboard Executivo
- **RF-10.1** KPIs no topo (cards):
  - Total de chamados (período).
  - Chamados pendentes de aprovação.
  - Chamados em falha.
  - Tempo médio de aprovação (h).
  - Tempo médio de conclusão (h).
  - Taxa de aprovação (%).
- **RF-10.2** Gráficos:
  - Chamados por status (donut/pizza).
  - Chamados por dia (linha, últimos 30 dias).
  - Chamados por loja origem (top 10, barra horizontal).
  - Tempo médio de aprovação por gestor (top 10).
- **RF-10.3** Filtros globais do dashboard: período (datepicker range, padrão últimos 30 dias), catálogo de serviço.
- **RF-10.4** Atualização dos dados: queries diretas ao banco com cache de 5 min (Redis).

### 3.11 RF-11 — Configurações do Sistema (Admin)
- **RF-11.1** Tela de configurações com:
  - Parâmetros de integração CASI (URL base, tenant_id, client_id, client_secret, scope, auth_key_rest_api, subscription_key) — somente Admin, valores sensíveis mascarados após salvar.
  - Configuração SMTP (host, porta, user, senha, from, TLS).
  - SLA padrão (h para aprovação, h para conclusão) — apenas informativo, sem escalonamento automático na V1.
  - Política de senha (configurável).
- **RF-11.2** Teste de conexão para CASI e SMTP (botões "Testar conexão").

---

## 4. Requisitos Não Funcionais

### 4.1 Performance
- **RNF-01** Suportar **100 acessos simultâneos** com tempo de resposta médio < 500ms para operações CRUD e < 2s para queries de listagem com filtros.
- **RNF-02** Dashboard deve carregar em < 3s (com cache).
- **RNF-03** Worker de integração CASI deve processar pelo menos 30 chamados/min.

### 4.2 Disponibilidade
- **RNF-04** Disponibilidade alvo: 99% em horário comercial (8h-20h dias úteis).
- **RNF-05** Health check HTTP em `/health` e `/ready` (Kubernetes-style).
- **RNF-06** Graceful shutdown (drenar requisições em andamento antes de parar).

### 4.3 Segurança
- **RNF-07** HTTPS obrigatório (TLS 1.2+). Em ambiente Docker, terminação SSL pode ser feita por reverse proxy (NGINX/Traefik).
- **RNF-08** OWASP Top 10 mitigado: SQL injection (uso de ORM/prepared statements), XSS (sanitização e CSP), CSRF (tokens), broken auth (JWT + bcrypt), etc.
- **RNF-09** Rate limiting:
  - Login: 5 tentativas / 15 min por IP+usuário.
  - Endpoints de API: 100 req/min por usuário autenticado.
  - Endpoints públicos (login, recuperação de senha): 20 req/min por IP.
- **RNF-10** Secrets nunca em log, em código ou em commits. Uso de `.env` (dev) e secret manager / vars de ambiente do orquestrador (prod).
- **RNF-11** CORS restrito ao domínio interno da empresa.
- **RNF-12** Headers de segurança: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.
- **RNF-13** Acesso apenas pela **rede interna da empresa** (firewall ou VPN). Sem exposição pública.

### 4.4 Observabilidade
- **RNF-14** Logs estruturados em JSON (pino ou winston) com correlation ID por requisição.
- **RNF-15** Níveis de log: DEBUG, INFO, WARN, ERROR. Padrão em produção: INFO.
- **RNF-16** Métricas expostas em `/metrics` (Prometheus format): contadores HTTP, latência, fila BullMQ, chamadas CASI (sucesso/falha).
- **RNF-17** Logs com retenção mínima de 90 dias.

### 4.5 Manutenibilidade
- **RNF-18** Cobertura mínima de testes automatizados: 70% para backend (unit + integração).
- **RNF-19** Documentação OpenAPI/Swagger gerada automaticamente, acessível em `/api-docs` (apenas para Analistas TI e Admins em produção).
- **RNF-20** README com instruções claras de setup local, build, testes, deploy.
- **RNF-21** Padrão de commits (Conventional Commits) e branch (Git Flow ou Trunk Based).

### 4.6 Acessibilidade e UX
- **RNF-22** Interface responsiva (desktop primário, tablet e mobile funcionais), seguindo os breakpoints definidos em `docs/DESIGN.md` (Desktop-XL 1440px, Desktop 1280px, Tablet 1024px, Mobile-Lg 768px, Mobile 480px).
- **RNF-23** Conformidade básica com WCAG 2.1 nível AA: contraste, labels, navegação por teclado, ARIA. Os tokens de cor de `docs/DESIGN.md` (em especial `{colors.ink}` sobre `{colors.canvas}` e sobre `{colors.surface-1}`) já foram pensados para esse nível de contraste.
- **RNF-24** Português brasileiro como idioma padrão. Estrutura de i18n preparada (mesmo com apenas pt-BR na V1).
- **RNF-25** Touch targets ≥ 40px de altura (≥ 44px para inputs em viewports touch), conforme `docs/DESIGN.md` § Responsive Behavior.
- **RNF-26** Toda implementação de UI deve consumir os tokens declarados em `docs/DESIGN.md` (cores, tipografia, espaçamento, raios). É proibido hardcode de valores visuais fora do sistema de tokens.

---

## 5. Arquitetura Técnica

### 5.1 Stack Tecnológica

#### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Fastify (preferencial pela performance) ou Express
- **Linguagem:** TypeScript (strict mode)
- **ORM:** Prisma
- **Banco:** PostgreSQL 16
- **Cache / Filas:** Redis 7 + BullMQ
- **Validação:** Zod
- **Autenticação:** JWT (jsonwebtoken) + bcrypt
- **HTTP Client (CASI):** axios ou undici (com timeout, retry e interceptors)
- **E-mail:** Nodemailer
- **Logs:** Pino
- **Testes:** Vitest (unit) + Supertest (integração) + Testcontainers (para Postgres real em testes)

#### Frontend
- **Framework:** React 18 + Vite
- **Linguagem:** TypeScript
- **Roteamento:** React Router v6
- **State / Data Fetching:** TanStack Query (React Query)
- **UI:** shadcn/ui + Tailwind CSS, **customizados para refletir os tokens declarados em `docs/DESIGN.md`** (paleta cream/charcoal/Fin Orange, tipografia Saans com fallback para Inter weight 500, raios `{rounded.md/lg/xl}`, espaçamentos base 8px).
- **Tipografia:** Saans (se disponível por licença) com fallback para **Inter** weight 500. Mono fallback: **JetBrains Mono** weight 400, conforme orientação de `docs/DESIGN.md` § Note on Font Substitutes.
- **Formulários:** React Hook Form + Zod
- **Gráficos:** Recharts — paleta restrita à *report palette* documentada em `docs/DESIGN.md` (`{colors.report-blue}`, `{colors.report-green}`, `{colors.report-pink}`, `{colors.report-lime}`, `{colors.report-orange}`, `{colors.report-cyan}`).
- **Datas:** date-fns (locale `pt-BR`)
- **Tabelas:** TanStack Table

#### Infraestrutura
- **Containerização:** Docker + Docker Compose
- **Reverse Proxy:** NGINX (terminação SSL, servir frontend buildado, roteamento de API)
- **Orquestração:** Docker Compose (V1). Kubernetes opcional em V2.
- **CI/CD:** GitHub Actions ou GitLab CI (build, testes, build de imagens, push para registry interno).

### 5.2 Design System (referência: `docs/DESIGN.md`)

A aparência da aplicação é regida integralmente por `docs/DESIGN.md`. Esta seção mapeia **como os tokens do DESIGN.md se traduzem nas telas concretas do ITSM**, sem repetir os valores em si (que ficam apenas no DESIGN.md como fonte única da verdade).

#### 5.2.1 Princípios herdados do DESIGN.md
- **Canvas cream (`{colors.canvas}`)** como plano de fundo padrão de toda a aplicação — nunca branco puro.
- **Charcoal (`{colors.ink}`)** como cor primária de sistema (CTAs, headlines, body).
- **Surface 1 (`{colors.surface-1}`)** branco para cartões flutuantes que recebem o conteúdo (cards de ticket, formulários, tabelas).
- **Fin Orange (`{colors.fin-orange}`) é proibido como CTA genérico.** No ITSM ele só pode ser usado para sinalizar ações ligadas a automação/IA (ex.: futuros catálogos de "Resolução automática" ou badges de "Processado por IA"). Para o catálogo de Alteração de Loja da V1 **não há uso de Fin Orange**.
- **Sem drop shadows.** Profundidade é comunicada pela troca de superfície (cream → white), conforme tabela de elevation do DESIGN.md.
- **Cantos de cards:** `{rounded.lg}` 12px para cards padrão (ticket, feature, FAQ) e `{rounded.xl}` 16px para cards-mockup/destaque. Botões e inputs em `{rounded.md}` 8px. **Nunca pill-rounded em CTAs.**

#### 5.2.2 Mapa de tokens → componentes do ITSM

| Componente do ITSM | Token do DESIGN.md | Observação |
|---|---|---|
| Layout base (background da página) | `{colors.canvas}` | Vale para todas as telas autenticadas |
| Cartão de ticket na listagem | `pricing-card` style (`{colors.surface-1}` + `{rounded.lg}` + padding `{spacing.lg}`) | Sem sombra, apenas lift sobre cream |
| Cartão de detalhe do ticket | `product-mockup-card` (`{colors.surface-1}` + `{rounded.xl}`) | É o "protagonista" da tela |
| Botão primário ("Abrir chamado", "Aprovar") | `button-primary` (charcoal) | Padding 10×18, `{rounded.md}` |
| Botão secundário ("Cancelar", "Voltar") | `button-secondary` | White on cream com hairline |
| Botão terciário ("Ver detalhes") | `button-tertiary` | Plain text sobre canvas |
| Botão de ação destrutiva ("Rejeitar") | `button-secondary` com texto em `{colors.semantic-error}` | Não introduzir cor de fundo destrutiva |
| Inputs de formulário | `text-input` / `text-input-focused` | `{rounded.md}`, fundo `{colors.surface-1}` |
| Top nav do app | `top-nav` | Cream bar 56px com logotipo à esquerda |
| Rodapé | `footer` | Tipografia em `{typography.caption}` |
| FAQ / Ajuda | `faq-row` | Accordion com `hairline-soft` |
| Banner de CTA / Empty state | `cta-banner` | Padding 48px |
| Dashboard — KPIs | Cards em `feature-card` | Número grande em `{typography.display-md}`, label em `{typography.eyebrow}` |
| Dashboard — gráficos | Recharts com cores `{colors.report-*}` | Restrito à report palette |
| Badge de status do ticket | Chips `{rounded.xs}` 4px | Ver mapa de cor por status abaixo |
| Avatar (autor/aprovador) | `{rounded.full}` 40px | Sem sombra |
| Tabelas (listagem detalhada) | Linhas em `{colors.surface-1}` alternadas opcionalmente com `{colors.surface-2}` | Hairlines `{colors.hairline-soft}` |

#### 5.2.3 Cores por status de ticket

Os status do ticket são representados por **chips** (`{rounded.xs}` 4px, `{typography.caption}` 12px, weight 500, padding 4×8) sobre `{colors.surface-1}`. A cor da borda/texto segue a *report palette* e a paleta semântica do DESIGN.md:

| Status | Cor do chip (texto + borda) |
|---|---|
| `AGUARDANDO_APROVACAO` | `{colors.report-blue}` |
| `APROVADO` | `{colors.ink-muted}` (neutro, transitório) |
| `EM_PROCESSAMENTO` | `{colors.report-cyan}` |
| `CONCLUIDO` | `{colors.semantic-success}` / `{colors.report-green}` |
| `REJEITADO` | `{colors.semantic-error}` |
| `CANCELADO` | `{colors.ink-tertiary}` |
| `FALHA_INTEGRACAO` | `{colors.semantic-error}` (com ícone de alerta) |
| `RASCUNHO` | `{colors.ink-subtle}` |

> Esses chips **não** usam Fin Orange — o DESIGN.md restringe seu uso a contextos de produto Fin/AI.

#### 5.2.4 Tipografia aplicada às telas do ITSM

| Elemento | Token tipográfico |
|---|---|
| Título da página (ex.: "Meus chamados") | `{typography.display-md}` |
| Título de seção dentro da página | `{typography.headline}` |
| Título de card (ex.: nome do catálogo no card) | `{typography.card-title}` |
| Subtítulo / lead em formulário | `{typography.subhead}` |
| Corpo padrão (tabelas, parágrafos) | `{typography.body}` |
| Helper text / descrição de campo | `{typography.body-sm}` |
| Eyebrow ("Aprovação pendente", em sentence case) | `{typography.eyebrow}` |
| Labels de botão | `{typography.button}` |
| Metadados (data, número do ticket, IP) | `{typography.caption}` |
| Trecho de log/JSON na tela do Analista TI | `{typography.mono}` (SaansMono / JetBrains Mono) |

#### 5.2.5 Implementação prática

- O Tailwind do projeto deve ser configurado com **todos os tokens do DESIGN.md** em `tailwind.config.ts` (cores, fontFamily, fontSize, lineHeight, letterSpacing, borderRadius, spacing). Nenhum desses valores deve aparecer hardcoded em componentes.
- O shadcn/ui deve ter seu tema customizado (`globals.css` + `tailwind.config.ts`) para refletir charcoal/cream/Fin Orange ao invés do tema escuro padrão.
- Criar uma página `/styleguide` (acessível apenas em ambiente dev e para perfil Admin em produção) que renderiza todos os componentes e tokens do DESIGN.md como referência viva para desenvolvedores.
- Recomenda-se rodar `npx @google/design.md lint docs/DESIGN.md` (citado na seção *Iteration Guide* do próprio DESIGN.md) como etapa do CI sempre que o DESIGN.md for editado.

### 5.3 Diagrama de Componentes (lógico)

```
┌─────────────────────────────────────────────────────────────┐
│                    Rede Interna da Empresa                  │
│                                                             │
│  ┌──────────┐      ┌─────────────┐     ┌──────────────┐    │
│  │ Browser  │─────▶│   NGINX     │────▶│   Frontend   │    │
│  │ (User)   │ HTTPS│ (TLS, proxy)│     │   (React)    │    │
│  └──────────┘      └──────┬──────┘     └──────────────┘    │
│                           │                                 │
│                           ▼                                 │
│                    ┌────────────┐                           │
│                    │  Backend   │                           │
│                    │  (Node/TS) │                           │
│                    └─┬────┬───┬─┘                           │
│                      │    │   │                             │
│              ┌───────┘    │   └────────┐                    │
│              ▼            ▼            ▼                    │
│       ┌──────────┐  ┌─────────┐  ┌──────────┐               │
│       │PostgreSQL│  │ Redis   │  │ Worker   │               │
│       │          │  │ (cache, │  │ (BullMQ) │               │
│       │          │  │  filas) │  │          │               │
│       └──────────┘  └─────────┘  └────┬─────┘               │
│                                       │                     │
└───────────────────────────────────────┼─────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │   API CASI (Azure)    │
                            │  - OAuth2 token       │
                            │  - /api/lojas         │
                            │  - /controle-acesso-* │
                            └───────────────────────┘
```

### 5.4 Estrutura de Diretórios Sugerida (Monorepo)

```
itsm-conexao/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── hierarchy/
│   │   │   │   ├── catalogs/
│   │   │   │   ├── tickets/
│   │   │   │   ├── approvals/
│   │   │   │   ├── notifications/
│   │   │   │   ├── audit/
│   │   │   │   ├── reports/
│   │   │   │   └── integrations/
│   │   │   │       └── casi/
│   │   │   ├── workers/
│   │   │   ├── shared/
│   │   │   │   ├── config/
│   │   │   │   ├── middleware/
│   │   │   │   ├── errors/
│   │   │   │   └── utils/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── migrations/
│   │   │   │   └── seed.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── routes/
│       │   └── main.tsx
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared-types/        # tipos compartilhados (DTOs, enums)
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── env/
│       └── .env.example
├── docs/
│   ├── DESIGN.md             # ← Design System (fonte da verdade visual)
│   ├── PRD_ITSM_Conexao_Tech.md
│   ├── api/
│   ├── architecture/
│   └── runbooks/
├── .github/workflows/
├── README.md
└── package.json
```

### 5.5 Modelo de Dados (principais entidades)

```prisma
// schema.prisma (resumo)

model User {
  id               String   @id @default(uuid())
  matricula        String   @unique
  nome             String
  email            String   @unique
  passwordHash     String
  role             Role     @default(COLABORADOR)
  status           UserStatus @default(ATIVO)
  managerId        String?
  manager          User?    @relation("Manages", fields: [managerId], references: [id])
  liderados        User[]   @relation("Manages")
  codDominio       Int
  codEmpresa       Int
  codLojaAtual     Int
  passwordChangedAt DateTime?
  lastLoginAt      DateTime?
  failedLoginCount Int      @default(0)
  lockedUntil      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tickets          Ticket[] @relation("Requester")
  approvals        Ticket[] @relation("Approver")
}

enum Role {
  COLABORADOR
  GESTOR
  ANALISTA_TI
  AUDITOR
  ADMIN
}

enum UserStatus {
  ATIVO
  INATIVO
}

model ServiceCatalog {
  id          String  @id @default(uuid())
  slug        String  @unique         // ex: "alteracao-loja"
  nome        String
  descricao   String
  categoria   String?
  icone       String?
  ativo       Boolean @default(true)
  formSchema  Json                    // JSON Schema do formulário
  workflow    Json                    // definição de etapas de aprovação
  integration String?                 // ex: "casi-alterar-loja"
  tickets     Ticket[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Ticket {
  id              String   @id @default(uuid())
  numero          Int      @unique @default(autoincrement())
  catalogId       String
  catalog         ServiceCatalog @relation(fields: [catalogId], references: [id])
  requesterId     String
  requester       User     @relation("Requester", fields: [requesterId], references: [id])
  approverId      String?
  approver        User?    @relation("Approver", fields: [approverId], references: [id])
  status          TicketStatus @default(AGUARDANDO_APROVACAO)
  formData        Json                  // dados preenchidos pelo solicitante
  approvalComment String?
  rejectionReason String?
  integrationLog  Json?                 // request/response da API CASI
  integrationAttempts Int @default(0)
  openedAt        DateTime @default(now())
  approvedAt      DateTime?
  completedAt     DateTime?
  rejectedAt      DateTime?
  cancelledAt     DateTime?
  history         TicketHistory[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum TicketStatus {
  RASCUNHO
  AGUARDANDO_APROVACAO
  APROVADO
  EM_PROCESSAMENTO
  CONCLUIDO
  REJEITADO
  CANCELADO
  FALHA_INTEGRACAO
}

model TicketHistory {
  id          String   @id @default(uuid())
  ticketId    String
  ticket      Ticket   @relation(fields: [ticketId], references: [id])
  fromStatus  TicketStatus?
  toStatus    TicketStatus
  actorId     String?
  comment     String?
  metadata    Json?
  createdAt   DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  entityType  String
  entityId    String
  action      String
  actorUserId String?
  actorIp     String?
  beforeValue Json?
  afterValue  Json?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorUserId])
  @@index([createdAt])
}

model SystemConfig {
  key         String   @id
  value       String                  // criptografado se sensível
  isSensitive Boolean  @default(false)
  updatedBy   String?
  updatedAt   DateTime @updatedAt
}

model CsvImportJob {
  id          String   @id @default(uuid())
  filename    String
  uploadedBy  String
  status      String                  // PENDING, PROCESSING, COMPLETED, FAILED
  totalRows   Int
  successRows Int      @default(0)
  errorRows   Int      @default(0)
  errorReport Json?
  createdAt   DateTime @default(now())
  finishedAt  DateTime?
}
```

### 5.6 Integração CASI — Detalhamento

#### 5.6.1 Camada de Cliente CASI (módulo `integrations/casi/`)
Encapsula toda a comunicação com a API. Expõe métodos tipados:

```typescript
interface CasiClient {
  getToken(): Promise<string>;                          // com cache em Redis
  listarLojas(codDominio: number, codEmpresa: number): Promise<Loja[]>;
  consultarUsuario(codDominio: number, matricula: number): Promise<UsuarioCasi>;
  alterarLojaDoUsuario(input: AlterarLojaInput): Promise<AlterarLojaResult>;
}
```

#### 5.6.2 Fluxo Detalhado de Alteração de Loja

```
1. Worker pega job da fila "tickets.aprovados"
2. Carrega ticket do banco
3. casiClient.getToken()
   → cache Redis hit? retorna
   → senão: POST login.microsoftonline.com/{tenant}/oauth2/v2.0/token
            grava em Redis com TTL 55min
4. casiClient.consultarUsuario(codDominio, matricula do solicitante)
   → POST /controle-acesso-usuarios/consultar
   → extrai array "controleAcesso" atual
5. Monta payload de PUT mantendo todos os controleAcesso, alterando apenas codLoja:
   {
     "usuarios": [{
       "codDominio": <domínio>,
       "numMatricula": <matrícula>,
       "nome": <nome>,
       "email": <email>,
       "controleAcesso": [
         // mesmo grupo, mesma empresa, mesmo sistema, NOVA loja
         { "codGrupo": X, "codEmpresa": Y, "codLoja": <NOVA>, "codSistema": Z }
       ],
       "autenticacaoLocal": <preservar valor original>
     }]
   }
6. PUT /controle-acesso-usuarios/alterar
7. Validar response:
   - HTTP 201 + qtdeRegAlterados >= 1  → SUCESSO
   - qualquer outro caso               → FALHA
8. SUCESSO:
   - atualizar User.codLojaAtual no banco local
   - transição ticket: EM_PROCESSAMENTO → CONCLUIDO
   - registrar em TicketHistory e AuditLog
   - disparar e-mails (solicitante + gestor)
9. FALHA:
   - registrar request/response em ticket.integrationLog
   - se attempts < 3: agendar retry com backoff
   - se attempts >= 3: transição → FALHA_INTEGRACAO + notificar Analistas TI
```

#### 5.6.3 Tratamento de Erros da API CASI

| Cenário | Ação |
|---|---|
| 401 Unauthorized | Invalidar token em cache e refazer fluxo (1 retry) |
| 403 Forbidden | FALHA_INTEGRACAO imediato (problema de permissão, não adianta tentar) |
| 429 Too Many Requests | Aplicar backoff conforme header `Retry-After` |
| 5xx (servidor CASI) | Retry com backoff exponencial (até 3x) |
| Timeout | Retry com backoff (até 3x) |
| Resposta com erros em `usuarios[].erros` | FALHA_INTEGRACAO + log do erro |

---

## 6. Setup Docker

### 6.1 Estrutura de Containers (V1)

```yaml
# infra/docker-compose.yml (resumo)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: itsm
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  backend:
    build: ../apps/backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/itsm
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      # demais variáveis...
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  worker:
    build: ../apps/backend
    command: node dist/workers/main.js
    environment:
      # mesmas variáveis do backend
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build: ../apps/frontend
    # gera build estático servido pelo nginx

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
```

### 6.2 Variáveis de Ambiente Mínimas

```bash
# .env.example
NODE_ENV=production

# Database
DB_USER=itsm_user
DB_PASSWORD=<strong-password>
DATABASE_URL=postgresql://itsm_user:<password>@postgres:5432/itsm

# Redis
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:<password>@redis:6379

# JWT
JWT_ACCESS_SECRET=<random-256-bit>
JWT_REFRESH_SECRET=<random-256-bit>
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=28800

# SMTP
SMTP_HOST=smtp.empresa.com.br
SMTP_PORT=587
SMTP_USER=no-reply@empresa.com.br
SMTP_PASSWORD=<password>
SMTP_FROM="ITSM Conexão Tech <no-reply@empresa.com.br>"
SMTP_TLS=true

# CASI API
CASI_BASE_URL=https://api.conexaotech.com.br
CASI_TENANT_ID=<tenant-id>
CASI_CLIENT_ID=<client-id>
CASI_CLIENT_SECRET=<client-secret>
CASI_SCOPE=<scope>
CASI_AUTH_KEY_REST_API=<chave-fornecida>
CASI_SUBSCRIPTION_KEY=<subscription-key>
CASI_DEFAULT_COD_DOMINIO=0

# App
APP_BASE_URL=https://itsm.empresa.local
APP_PORT=3000
LOG_LEVEL=info
```

---

## 7. Plano de Entrega (Sugestão de Sprints)

| Sprint | Duração | Entregas |
|---|---|---|
| **0 - Setup** | 1 sem | Repositório, CI/CD, Docker Compose, schema inicial, esqueleto backend/frontend, autenticação básica funcionando, **`tailwind.config.ts` populado com todos os tokens de `docs/DESIGN.md`**, página `/styleguide` renderizando os componentes base (button-primary, button-secondary, card, input, chip de status) |
| **1 - Usuários e Hierarquia** | 2 sem | CRUD usuários, hierarquia, importação CSV, telas admin, auditoria base |
| **2 - Catálogo e Ticket** | 2 sem | Estrutura genérica de catálogo, catálogo "Alteração de Loja", formulário dinâmico, criação de chamado, listagem básica |
| **3 - Workflow de Aprovação** | 1 sem | Fluxo de aprovação/rejeição/cancelamento, transições de status, e-mails básicos |
| **4 - Integração CASI** | 2 sem | Cliente CASI, worker, fila, OAuth2 + cache, fluxo completo de alteração, tratamento de erros, retry |
| **5 - Dashboard e Relatórios** | 1 sem | Dashboard executivo, listagem com filtros avançados, exportação CSV |
| **6 - Notificações e Polimento** | 1 sem | Templates de e-mail finalizados **aderentes à identidade visual do `docs/DESIGN.md`** (cream canvas, charcoal, sem Fin Orange), melhorias UX, testes end-to-end, fixes |
| **7 - Hardening e Deploy** | 1 sem | Testes de carga (100 usuários simultâneos), pentest interno, **revisão visual de aderência ao `docs/DESIGN.md`**, documentação final, deploy em homologação |

**Total estimado: ~11 semanas** (com 1 dev full stack sênior dedicado).

---

## 8. Critérios de Aceite (V1)

- [ ] Colaborador consegue se autenticar e abrir um chamado de "Alteração de Loja".
- [ ] Gestor recebe e-mail e consegue aprovar/rejeitar o chamado.
- [ ] Após aprovação, o sistema chama a API CASI e altera a loja com sucesso.
- [ ] Após sucesso da API, o chamado é encerrado automaticamente e ambos (solicitante e gestor) recebem e-mail.
- [ ] Em caso de falha de integração, o chamado é marcado como FALHA_INTEGRACAO e analistas de TI são notificados.
- [ ] Analista de TI consegue reprocessar manualmente um chamado em FALHA_INTEGRACAO.
- [ ] Admin consegue importar hierarquia via CSV.
- [ ] Dashboard exibe KPIs e gráficos corretamente.
- [ ] Auditoria registra todas as ações relevantes.
- [ ] Sistema suporta 100 usuários simultâneos no teste de carga sem degradação acima de 500ms na maioria das rotas.
- [ ] Aplicação roda completamente via `docker compose up` em ambiente limpo seguindo o README.
- [ ] Acessível apenas via rede interna (validar com firewall/VPN).
- [ ] Cobertura de testes ≥ 70% no backend.
- [ ] Documentação OpenAPI publicada em `/api-docs`.
- [ ] **Interface 100% aderente ao `docs/DESIGN.md`** — paleta, tipografia, raios, espaçamentos e componentes. Validado em revisão visual com a página `/styleguide`.
- [ ] **Tailwind config consome tokens do DESIGN.md** — zero valores visuais hardcoded em componentes.
- [ ] Fin Orange **não** aparece em CTAs genéricos nem em chips de status na V1.

---

## 9. Riscos e Mitigações

| Risco | Impacto | Probab. | Mitigação |
|---|---|---|---|
| API CASI ficar indisponível ou lenta | Alto | Médio | Fila assíncrona + retry com backoff + circuit breaker; chamados em FALHA_INTEGRACAO podem ser reprocessados |
| Token OAuth2 expirar durante processamento | Médio | Alto | Cache com TTL 55min (5min de margem) + retry automático em caso de 401 |
| Importação CSV com dados inconsistentes | Médio | Alto | Validação linha a linha + relatório de erros + modo dry-run antes do commit |
| Loops hierárquicos no cadastro de gestor | Alto | Baixo | Validação no momento do cadastro/edição (DFS no grafo de gestores) |
| Vazamento de credenciais CASI nos logs | Alto | Médio | Interceptor de logs com mascaramento; revisão de logs em code review |
| Necessidade futura de SSO travar arquitetura | Médio | Alto | Camada de autenticação abstrata desde V1 (interface AuthProvider) |
| Sobrecarga do banco em queries de dashboard | Médio | Médio | Cache Redis de 5 min nos dados agregados + índices apropriados |
| Migração para outros catálogos exigir refactor | Alto | Médio | Modelo de catálogo genérico com JSON Schema desde V1 |

---

## 10. Glossário

- **CASI** — Sistema da Conexão Tech para controle de acesso (usuários, grupos, lojas, empresas, domínios).
- **codDominio / codEmpresa / codLoja** — Identificadores numéricos hierárquicos na estrutura CASI.
- **ITSM** — IT Service Management. Categoria de software para gestão de serviços de TI.
- **OAuth2 client_credentials** — Fluxo de autenticação machine-to-machine usado pelo CASI via Azure AD.
- **Workflow** — Fluxo de etapas de aprovação configurável por catálogo.
- **JSON Schema** — Padrão para descrever a estrutura de um formulário/dado JSON.
- **BullMQ** — Biblioteca Node.js para filas de processamento assíncrono com Redis.
- **SLA** — Service Level Agreement. Acordo de nível de serviço (ex: aprovar em até 24h).

---

## 11. Anexos

### 11.1 Referência: Endpoints CASI utilizados na V1

| Método | Endpoint | Uso |
|---|---|---|
| POST | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Obtenção do access token OAuth2 |
| GET | `/api/lojas/{codDominio}/{codEmpresa}` | Listar lojas para o dropdown do formulário |
| POST | `/controle-acesso-usuarios/consultar` | Obter dados atuais do usuário (incluindo `controleAcesso`) |
| PUT | `/controle-acesso-usuarios/alterar` | Efetivar a alteração de loja |

### 11.2 Headers obrigatórios CASI (SaaS)
```
Authorization: Bearer {access_token}
auth_key_rest_api: {chave_fornecida_pela_conexao_tech}
Ocp-Apim-Subscription-Key: {subscription_key_fornecida_pela_conexao_tech}
Content-Type: application/json
```

### 11.3 Convenções de Status HTTP do CASI observadas no manual
- **200** OK (consultas e algumas alterações)
- **201** Created (criações e alterações com sucesso em algumas operações)
- Validar sempre **`codigoHTTP`** dentro do corpo da resposta + campo `mensagem` ou `erros[]`.

---

**Fim do PRD v1.1**

> Este PRD deve ser utilizado como entrada para o Claude Code. Recomenda-se iniciar o desenvolvimento pelo Sprint 0 (Setup) e validar com este documento ao final de cada sprint.
>
> **Antes de qualquer trabalho de frontend, ler `docs/DESIGN.md` integralmente.** O PRD descreve *o que* construir; o DESIGN.md descreve *como deve parecer*.

---

## 12. Histórico de Revisões do PRD

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0 | 20/05/2026 | Time TI | Versão inicial do PRD |
| 1.1 | 20/05/2026 | Time TI | Referência explícita a `docs/DESIGN.md`; nova seção 5.2 (Design System aplicado ao ITSM); renumeração das seções 5.3–5.6; tokens de UI integrados em RNF-22 a RNF-26; ajustes na stack de Frontend (Inter como fallback de Saans, Recharts restrito à report palette); critérios de aceite e plano de entrega atualizados para refletir aderência visual |
