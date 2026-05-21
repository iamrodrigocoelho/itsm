import { cn } from '@/lib/utils';
import { TicketStatus } from '@itsm/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// /styleguide — Live reference for all DESIGN.md tokens and components
// Accessible in dev without login; Admin-only in production (see routes/index.tsx)
// ─────────────────────────────────────────────────────────────────────────────

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-spacing-section">
      <h2 className="text-headline font-medium text-ink mb-spacing-xl border-b border-hairline pb-spacing-sm">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-spacing-xs mb-spacing-lg">
      <span className="text-eyebrow text-ink-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-spacing-md">{children}</div>
    </div>
  );
}

// ── Color Swatch ──────────────────────────────────────────────────────────────

const COLOR_TOKENS = [
  { token: 'colors.ink',              value: '#111111',  name: 'Ink',              cls: 'bg-ink' },
  { token: 'colors.on-primary',       value: '#ffffff',  name: 'On Primary',       cls: 'bg-on-primary border border-hairline' },
  { token: 'colors.fin-orange',       value: '#ff5600',  name: 'Fin Orange',       cls: 'bg-fin-orange' },
  { token: 'colors.report-orange',    value: '#ff7a00',  name: 'Report Orange',    cls: 'bg-report-orange' },
  { token: 'colors.brand-blue',       value: '#0007cb',  name: 'Brand Blue',       cls: 'bg-brand-blue' },
  { token: 'colors.canvas',           value: '#f5f1ec',  name: 'Canvas',           cls: 'bg-canvas border border-hairline' },
  { token: 'colors.surface-1',        value: '#ffffff',  name: 'Surface 1',        cls: 'bg-surface-1 border border-hairline' },
  { token: 'colors.surface-2',        value: '#ede9e3',  name: 'Surface 2',        cls: 'bg-surface-2' },
  { token: 'colors.hairline',         value: '#d3cec6',  name: 'Hairline',         cls: 'bg-hairline' },
  { token: 'colors.hairline-soft',    value: '#e8e4de',  name: 'Hairline Soft',    cls: 'bg-hairline-soft' },
  { token: 'colors.inverse-canvas',   value: '#000000',  name: 'Inverse Canvas',   cls: 'bg-inverse-canvas' },
  { token: 'colors.ink-muted',        value: '#626260',  name: 'Ink Muted',        cls: 'bg-ink-muted' },
  { token: 'colors.ink-subtle',       value: '#7b7b78',  name: 'Ink Subtle',       cls: 'bg-ink-subtle' },
  { token: 'colors.ink-tertiary',     value: '#9c9fa5',  name: 'Ink Tertiary',     cls: 'bg-ink-tertiary' },
  { token: 'colors.semantic-error',   value: '#d93b3b',  name: 'Semantic Error',   cls: 'bg-semantic-error' },
  { token: 'colors.semantic-success', value: '#2a9a5a',  name: 'Semantic Success', cls: 'bg-semantic-success' },
  { token: 'colors.report-blue',      value: '#3b72e8',  name: 'Report Blue',      cls: 'bg-report-blue' },
  { token: 'colors.report-green',     value: '#2a9a5a',  name: 'Report Green',     cls: 'bg-report-green' },
  { token: 'colors.report-pink',      value: '#e84b8a',  name: 'Report Pink',      cls: 'bg-report-pink' },
  { token: 'colors.report-lime',      value: '#8bc34a',  name: 'Report Lime',      cls: 'bg-report-lime' },
  { token: 'colors.report-cyan',      value: '#00b8d9',  name: 'Report Cyan',      cls: 'bg-report-cyan' },
];

function ColorSwatch({ token, value, name, cls }: (typeof COLOR_TOKENS)[0]) {
  return (
    <div className="flex flex-col gap-1 w-28">
      <div className={cn('h-12 rounded-md', cls)} />
      <span className="text-caption font-medium text-ink">{name}</span>
      <span className="text-caption text-ink-muted font-mono">{value}</span>
      <span className="text-caption text-ink-subtle leading-tight">{token}</span>
    </div>
  );
}

// ── Typography samples ────────────────────────────────────────────────────────

const TYPE_TOKENS = [
  { token: 'display-xl',  cls: 'text-display-xl  font-medium', sample: 'Display XL — 72px' },
  { token: 'display-lg',  cls: 'text-display-lg  font-medium', sample: 'Display LG — 56px' },
  { token: 'display-md',  cls: 'text-display-md  font-medium', sample: 'Display MD — 40px' },
  { token: 'headline',    cls: 'text-headline    font-medium', sample: 'Headline — 28px' },
  { token: 'card-title',  cls: 'text-card-title  font-medium', sample: 'Card Title — 22px' },
  { token: 'subhead',     cls: 'text-subhead',                 sample: 'Subhead — 20px' },
  { token: 'body-lg',     cls: 'text-body-lg',                 sample: 'Body LG — 18px' },
  { token: 'body',        cls: 'text-body',                    sample: 'Body — 16px' },
  { token: 'body-sm',     cls: 'text-body-sm',                 sample: 'Body SM — 14px' },
  { token: 'caption',     cls: 'text-caption',                 sample: 'Caption — 12px' },
  { token: 'button',      cls: 'text-button  font-medium',     sample: 'Button Label — 15px' },
  { token: 'eyebrow',     cls: 'text-eyebrow font-medium',     sample: 'Eyebrow label — 14px' },
  { token: 'mono',        cls: 'text-mono font-mono',          sample: 'const code = "SaansMono" // 13px' },
];

// ── Status chip map ───────────────────────────────────────────────────────────

const CHIP_MAP: Record<TicketStatus, string> = {
  [TicketStatus.AGUARDANDO_APROVACAO]: 'chip-aguardando-aprovacao',
  [TicketStatus.APROVADO]:             'chip-aprovado',
  [TicketStatus.EM_PROCESSAMENTO]:     'chip-em-processamento',
  [TicketStatus.CONCLUIDO]:            'chip-concluido',
  [TicketStatus.REJEITADO]:            'chip-rejeitado',
  [TicketStatus.CANCELADO]:            'chip-cancelado',
  [TicketStatus.FALHA_INTEGRACAO]:     'chip-falha-integracao',
  [TicketStatus.RASCUNHO]:             'chip-rascunho',
};

const CHIP_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.AGUARDANDO_APROVACAO]: 'Aguardando aprovação',
  [TicketStatus.APROVADO]:             'Aprovado',
  [TicketStatus.EM_PROCESSAMENTO]:     'Em processamento',
  [TicketStatus.CONCLUIDO]:            'Concluído',
  [TicketStatus.REJEITADO]:            'Rejeitado',
  [TicketStatus.CANCELADO]:            'Cancelado',
  [TicketStatus.FALHA_INTEGRACAO]:     'Falha de integração ⚠',
  [TicketStatus.RASCUNHO]:             'Rascunho',
};

// ── Product mockup SVG placeholder ───────────────────────────────────────────

function ProductMockupPlaceholder() {
  return (
    <svg
      viewBox="0 0 800 500"
      className="w-full"
      aria-label="Product UI screenshot placeholder"
      role="img"
    >
      {/* Window chrome */}
      <rect width="800" height="500" fill="#f5f1ec" rx="8" />
      <rect width="800" height="40" fill="#e8e4de" rx="8" />
      <rect y="32" width="800" height="8" fill="#e8e4de" />
      <circle cx="20" cy="20" r="6" fill="#d3cec6" />
      <circle cx="40" cy="20" r="6" fill="#d3cec6" />
      <circle cx="60" cy="20" r="6" fill="#d3cec6" />
      {/* Sidebar */}
      <rect x="0" y="40" width="200" height="460" fill="#ede9e3" />
      {/* Nav items */}
      {[80, 120, 160, 200, 240].map((y) => (
        <rect key={y} x="16" y={y} width={y === 80 ? 140 : 120} height="12" rx="4" fill="#d3cec6" />
      ))}
      {/* Content area */}
      <rect x="216" y="56" width="568" height="32" rx="4" fill="#d3cec6" />
      {/* KPI cards */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={216 + i * 144} y="104" width="128" height="80" rx="8" fill="#ffffff" />
          <rect x={232 + i * 144} y="120" width="64" height="20" rx="4" fill="#d3cec6" />
          <rect x={232 + i * 144} y="148" width="88" height="12" rx="4" fill="#e8e4de" />
        </g>
      ))}
      {/* Table */}
      <rect x="216" y="200" width="568" height="280" rx="8" fill="#ffffff" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x="232" y={224 + i * 40} width="200" height="10" rx="4" fill="#e8e4de" />
          <rect x="452" y={224 + i * 40} width="80"  height="10" rx="4" fill="#e8e4de" />
          <rect x="552" y={224 + i * 40} width="64"  height="18" rx="4" fill={i === 0 ? '#3b72e8' : i === 2 ? '#2a9a5a' : '#e8e4de'} opacity="0.3" />
          {i < 5 && <line x1="232" y1={248 + i * 40} x2="768" y2={248 + i * 40} stroke="#e8e4de" strokeWidth="1" />}
        </g>
      ))}
      <text x="400" y="488" textAnchor="middle" fill="#9c9fa5" fontSize="11" fontFamily="Inter, sans-serif">
        Product UI screenshot placeholder — Sprint 0
      </text>
    </svg>
  );
}

// ── Main Styleguide page ──────────────────────────────────────────────────────

export function StyleguidePage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Top nav */}
      <nav className="top-nav gap-spacing-md">
        <span className="text-card-title font-medium text-ink">ITSM</span>
        <span className="text-body-sm text-ink-muted">Styleguide</span>
        <span className="ml-auto">
          <span className="chip chip-concluido">Sprint 0</span>
        </span>
      </nav>

      <div className="mx-auto max-w-content px-spacing-lg py-spacing-section">

        {/* ── Header ── */}
        <div className="mb-spacing-section">
          <p className="text-eyebrow text-ink-muted mb-spacing-xs">Design System</p>
          <h1 className="text-display-md font-medium text-ink">Styleguide</h1>
          <p className="mt-spacing-sm text-body text-ink-muted max-w-[640px]">
            Referência viva de todos os tokens e componentes do{' '}
            <code className="text-mono font-mono bg-surface-2 px-1 rounded-xs">docs/DESIGN.md</code>.
            Disponível sem autenticação em desenvolvimento; apenas Admins em produção.
          </p>
        </div>

        {/* ══ 1. Cores ══ */}
        <Section title="Cores">
          <div className="flex flex-wrap gap-spacing-md">
            {COLOR_TOKENS.map((t) => (
              <ColorSwatch key={t.token} {...t} />
            ))}
          </div>
        </Section>

        {/* ══ 2. Tipografia ══ */}
        <Section title="Tipografia">
          <div className="flex flex-col divide-y divide-hairline-soft">
            {TYPE_TOKENS.map(({ token, cls, sample }) => (
              <div key={token} className="flex items-baseline justify-between py-spacing-sm gap-spacing-lg">
                <span className={cn('text-ink shrink-0', cls)}>{sample}</span>
                <code className="text-caption text-ink-muted font-mono shrink-0">
                  {'{typography.'}
                  {token}
                  {'}'}
                </code>
              </div>
            ))}
          </div>
        </Section>

        {/* ══ 3. Botões ══ */}
        <Section title="Botões">
          <Row label="button-primary — Charcoal CTA (Aprovar, Abrir chamado)">
            <button className="btn-primary">Abrir chamado</button>
            <button className="btn-primary">Aprovar</button>
            <button className="btn-primary" disabled>Desabilitado</button>
          </Row>
          <Row label="button-secondary — White on cream (Cancelar, Voltar)">
            <button className="btn-secondary">Cancelar</button>
            <button className="btn-secondary">Voltar</button>
          </Row>
          <Row label="button-tertiary — Plain text (Ver detalhes)">
            <button className="btn-tertiary">Ver detalhes</button>
            <button className="btn-tertiary">Exportar CSV</button>
          </Row>
          <Row label="button-secondary com texto em semantic-error (Rejeitar — não introduz fundo destrutivo)">
            <button className="btn-secondary text-semantic-error border-semantic-error/40">
              Rejeitar
            </button>
          </Row>
          <Row label="button-fin — FIN ORANGE: reservado para CTAs de IA/Fin APENAS">
            <button className="btn-fin">Experimente o Fin</button>
          </Row>
        </Section>

        {/* ══ 4. Inputs ══ */}
        <Section title="Inputs de formulário">
          <Row label="text-input — default">
            <div className="w-72">
              <input className="text-input" type="text" placeholder="Digite aqui…" />
            </div>
          </Row>
          <Row label="text-input-focused — focused state">
            <div className="w-72">
              <input className="text-input-focused" type="text" defaultValue="Valor preenchido" />
            </div>
          </Row>
          <Row label="text-input com erro (border semantic-error)">
            <div className="flex flex-col gap-1 w-72">
              <input
                className="text-input border-semantic-error focus:border-semantic-error"
                type="text"
                defaultValue="valor inválido"
              />
              <p className="text-caption text-semantic-error">Campo obrigatório</p>
            </div>
          </Row>
        </Section>

        {/* ══ 5. Cards ══ */}
        <Section title="Cards">
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-spacing-lg mb-spacing-lg">

            {/* pricing-card */}
            <div className="pricing-card">
              <p className="text-eyebrow text-ink-muted mb-spacing-xs">pricing-card</p>
              <h3 className="text-card-title font-medium text-ink">Plano Starter</h3>
              <p className="text-body-sm text-ink-muted mt-spacing-xs">
                Ideal para pequenas equipes com até 10 usuários.
              </p>
              <p className="text-display-md font-medium text-ink mt-spacing-md">R$ 299</p>
              <p className="text-caption text-ink-muted">por mês</p>
              <button className="btn-primary mt-spacing-lg w-full">Começar</button>
            </div>

            {/* pricing-card-featured */}
            <div className="pricing-card-featured">
              <p className="text-eyebrow text-on-primary/60 mb-spacing-xs">pricing-card-featured</p>
              <h3 className="text-card-title font-medium text-on-primary">Plano Pro</h3>
              <p className="text-body-sm text-on-primary/70 mt-spacing-xs">
                Para times que precisam de automações e integrações.
              </p>
              <p className="text-display-md font-medium text-on-primary mt-spacing-md">R$ 899</p>
              <p className="text-caption text-on-primary/60">por mês</p>
              <button className="btn-secondary mt-spacing-lg w-full">Começar</button>
            </div>

            {/* feature-card */}
            <div className="feature-card">
              <p className="text-eyebrow text-ink-muted mb-spacing-xs">feature-card</p>
              <h3 className="text-card-title font-medium text-ink">Aprovação automática</h3>
              <p className="text-body-sm text-ink-muted mt-spacing-xs">
                Fluxo de aprovação configurable por catálogo, com notificações em cada etapa.
              </p>
            </div>

          </div>

          {/* product-mockup-card — full width, protagonist */}
          <div>
            <p className="text-eyebrow text-ink-muted mb-spacing-sm">
              product-mockup-card — cartão protagonista, rounded-xl
            </p>
            <div className="product-mockup-card">
              <ProductMockupPlaceholder />
            </div>
          </div>

          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-spacing-lg mt-spacing-lg">
            {/* testimonial-card */}
            <div className="testimonial-card">
              <p className="text-eyebrow text-ink-muted mb-spacing-sm">testimonial-card</p>
              <p className="text-body-lg text-ink">
                "O sistema reduziu em 70% o tempo de aprovação de chamados de alteração de loja."
              </p>
              <div className="flex items-center gap-spacing-sm mt-spacing-md">
                <div className="avatar">
                  <span className="text-caption font-medium text-ink-muted">AT</span>
                </div>
                <div>
                  <p className="text-body-sm font-medium text-ink">Ana Tavares</p>
                  <p className="text-caption text-ink-muted">Gerente de TI, Drogaria Venancio</p>
                </div>
              </div>
            </div>

            {/* cta-banner */}
            <div className="cta-banner">
              <p className="text-eyebrow text-ink-muted mb-spacing-xs">cta-banner</p>
              <h3 className="text-headline font-medium text-ink">Pronto para começar?</h3>
              <p className="text-body text-ink-muted mt-spacing-xs mb-spacing-lg">
                Configure sua primeira solicitação em minutos.
              </p>
              <button className="btn-primary">Abrir chamado</button>
            </div>
          </div>
        </Section>

        {/* ══ 6. Status Chips ══ */}
        <Section title="Chips de Status — Tickets">
          <p className="text-body-sm text-ink-muted mb-spacing-lg">
            rounded-xs · caption · weight 500 · padding 4×8. Sem Fin Orange — restrito a contextos
            Fin/AI.
          </p>
          <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-wrap gap-spacing-md">
            {(Object.entries(CHIP_MAP) as [TicketStatus, string][]).map(([status, cls]) => (
              <span key={status} className={cls}>
                {CHIP_LABELS[status]}
              </span>
            ))}
          </div>

          {/* Mapa de status → cor (tabela) */}
          <div className="mt-spacing-lg overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left py-spacing-xs pr-spacing-lg text-eyebrow text-ink-muted font-medium">
                    Status
                  </th>
                  <th className="text-left py-spacing-xs text-eyebrow text-ink-muted font-medium">
                    Token de cor
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AGUARDANDO_APROVACAO', '{colors.report-blue}'],
                  ['APROVADO',             '{colors.ink-muted}'],
                  ['EM_PROCESSAMENTO',     '{colors.report-cyan}'],
                  ['CONCLUIDO',            '{colors.semantic-success}'],
                  ['REJEITADO',            '{colors.semantic-error}'],
                  ['CANCELADO',            '{colors.ink-tertiary}'],
                  ['FALHA_INTEGRACAO',     '{colors.semantic-error} + ícone ⚠'],
                  ['RASCUNHO',             '{colors.ink-subtle}'],
                ].map(([status, token]) => (
                  <tr key={status} className="border-b border-hairline-soft">
                    <td className="py-spacing-xs pr-spacing-lg font-mono text-mono text-ink">
                      {status}
                    </td>
                    <td className="py-spacing-xs text-ink-muted">{token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ══ 7. Navegação (Top Nav) ══ */}
        <Section title="Navegação">
          <p className="text-eyebrow text-ink-muted mb-spacing-sm">
            top-nav — sticky cream bar, height 56px
          </p>
          <div className="rounded-lg border border-hairline overflow-hidden">
            <nav className="top-nav static gap-spacing-md">
              <span className="text-card-title font-medium text-ink">ITSM</span>
              <div className="flex gap-spacing-lg ml-spacing-xl">
                <a href="#" className="text-body-sm text-ink hover:text-ink-muted transition-colors">
                  Chamados
                </a>
                <a href="#" className="text-body-sm text-ink-muted hover:text-ink transition-colors">
                  Catálogo
                </a>
                <a href="#" className="text-body-sm text-ink-muted hover:text-ink transition-colors">
                  Dashboard
                </a>
              </div>
              <div className="ml-auto flex items-center gap-spacing-sm">
                <button className="btn-tertiary text-body-sm py-1">Perfil</button>
                <button className="btn-primary text-body-sm py-1 px-spacing-md">Sair</button>
              </div>
            </nav>
          </div>
        </Section>

        {/* ══ 8. FAQ Row ══ */}
        <Section title="FAQ Row">
          <p className="text-eyebrow text-ink-muted mb-spacing-sm">
            faq-row — accordion, hairline-soft bottom border
          </p>
          <div className="rounded-lg border border-hairline overflow-hidden">
            {[
              'Como abrir um chamado de alteração de loja?',
              'Quanto tempo leva para o gestor aprovar?',
              'O que acontece se a integração com o CASI falhar?',
            ].map((q, i) => (
              <details key={i} className="faq-row group">
                <summary className="cursor-pointer flex items-center justify-between text-body font-medium text-ink">
                  {q}
                  <span className="ml-spacing-sm text-ink-muted group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="mt-spacing-sm text-body-sm text-ink-muted">
                  Resposta de exemplo — conteúdo da FAQ será preenchido no Sprint 6.
                </p>
              </details>
            ))}
          </div>
        </Section>

        {/* ══ 9. Elevação / Superfície ══ */}
        <Section title="Elevação e Superfície">
          <p className="text-body-sm text-ink-muted mb-spacing-lg">
            Profundidade via troca de superfície (cream → white). Sem drop shadows.
          </p>
          <div className="flex gap-spacing-lg flex-wrap">
            <div className="flex flex-col items-center gap-spacing-xs">
              <div className="w-24 h-16 bg-canvas rounded-md border border-hairline-soft" />
              <span className="text-caption text-ink-muted">Level 0 — flat</span>
            </div>
            <div className="flex flex-col items-center gap-spacing-xs">
              <div className="w-24 h-16 bg-surface-1 rounded-md" />
              <span className="text-caption text-ink-muted">Level 1 — lift on cream</span>
            </div>
            <div className="flex flex-col items-center gap-spacing-xs">
              <div className="w-24 h-16 bg-surface-1 rounded-md border border-hairline" />
              <span className="text-caption text-ink-muted">Level 2 — hairline lift</span>
            </div>
            <div className="flex flex-col items-center gap-spacing-xs">
              <div className="w-24 h-16 bg-inverse-canvas rounded-md" />
              <span className="text-caption text-ink-muted">Level 3 — deep accent</span>
            </div>
          </div>
        </Section>

        {/* ══ 10. Avatar ══ */}
        <Section title="Avatar">
          <Row label="rounded-full · 40px · sem sombra">
            {['AT', 'JB', 'MC'].map((initials) => (
              <div key={initials} className="avatar">
                <span className="text-caption font-medium text-ink-muted">{initials}</span>
              </div>
            ))}
          </Row>
        </Section>

        {/* ══ 11. Border Radius ══ */}
        <Section title="Border Radius">
          <div className="flex flex-wrap gap-spacing-lg">
            {[
              { token: 'rounded.xs',   cls: 'rounded-xs',   label: 'xs — 4px' },
              { token: 'rounded.sm',   cls: 'rounded-sm',   label: 'sm — 6px' },
              { token: 'rounded.md',   cls: 'rounded-md',   label: 'md — 8px' },
              { token: 'rounded.lg',   cls: 'rounded-lg',   label: 'lg — 12px' },
              { token: 'rounded.xl',   cls: 'rounded-xl',   label: 'xl — 16px' },
              { token: 'rounded.xxl',  cls: 'rounded-xxl',  label: 'xxl — 24px' },
              { token: 'rounded.pill', cls: 'rounded-pill', label: 'pill — 9999px' },
              { token: 'rounded.full', cls: 'rounded-full', label: 'full — 9999px' },
            ].map(({ token, cls, label }) => (
              <div key={token} className="flex flex-col items-center gap-spacing-xs">
                <div className={cn('w-16 h-16 bg-ink', cls)} />
                <span className="text-caption text-ink">{label}</span>
                <span className="text-caption text-ink-muted">{`{${token}}`}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Footer */}
      <footer className="footer border-t border-hairline-soft">
        <p>ITSM Conexão Tech · Styleguide · Sprint 0</p>
        <p className="mt-spacing-xs text-ink-subtle">
          Tokens definidos em <code className="font-mono">docs/DESIGN.md</code>. Zero valores
          hardcoded em componentes.
        </p>
      </footer>
    </div>
  );
}
