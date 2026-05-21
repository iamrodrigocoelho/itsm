import type { Config } from 'tailwindcss';

// ─────────────────────────────────────────────────────────────────────────────
// ITSM Design System Tokens
// Source of truth: docs/DESIGN.md
// DO NOT hardcode visual values in components — use these tokens only.
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // ── Colors ───────────────────────────────────────────────────────────────
    // All color tokens from DESIGN.md §Colors
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      // Brand & Accent
      ink: '#111111',          // {colors.ink} — system primary: headlines, body, CTA background
      'on-primary': '#ffffff', // {colors.on-primary} — text on charcoal CTAs
      'fin-orange': '#ff5600', // {colors.fin-orange} — AI product accent ONLY (Fin badge/CTA)
      'report-orange': '#ff7a00', // {colors.report-orange} — in-product analytics palette
      'brand-blue': '#0007cb', // {colors.brand-blue} — marketing illustrations

      // Surface
      canvas: '#f5f1ec',       // {colors.canvas} — default page background (cream, NEVER pure white)
      'surface-1': '#ffffff',  // {colors.surface-1} — floating cards (pricing, feature, mockup)
      'surface-2': '#ede9e3',  // {colors.surface-2} — alt-row stripes, tinted banners
      hairline: '#d3cec6',     // {colors.hairline} — 1px borders on cards
      'hairline-soft': '#e8e4de', // {colors.hairline-soft} — dividers between FAQ rows
      'inverse-canvas': '#000000', // {colors.inverse-canvas} — testimonial/quote strip
      'inverse-surface-1': '#1a1a1a', // {colors.inverse-surface-1} — hovered footer items dark

      // Text
      'ink-muted': '#626260',    // {colors.ink-muted} — secondary type, meta info
      'ink-subtle': '#7b7b78',   // {colors.ink-subtle} — tertiary type, helper text
      'ink-tertiary': '#9c9fa5', // {colors.ink-tertiary} — disabled, footnotes
      'inverse-ink': '#ffffff',  // {colors.inverse-ink} — quote-strip type
      'inverse-ink-muted': '#c0bdb9', // {colors.inverse-ink-muted} — quote-strip meta

      // Semantic
      'semantic-error': '#d93b3b',   // {colors.semantic-error} — form validation, destructive
      'semantic-success': '#2a9a5a', // {colors.semantic-success} — positive states

      // Report palette (in-product analytics / charts — NOT brand surface colors)
      'report-blue': '#3b72e8',  // {colors.report-blue}
      'report-green': '#2a9a5a', // {colors.report-green}
      'report-pink': '#e84b8a',  // {colors.report-pink}
      'report-lime': '#8bc34a',  // {colors.report-lime}
      'report-cyan': '#00b8d9',  // {colors.report-cyan}
    },

    // ── Border Radius ─────────────────────────────────────────────────────────
    // All radius tokens from DESIGN.md §Shapes
    borderRadius: {
      none: '0',
      xs: '4px',    // {rounded.xs} — small chips, badges
      sm: '6px',    // {rounded.sm} — inline tags
      md: '8px',    // {rounded.md} — all buttons, form inputs
      lg: '12px',   // {rounded.lg} — pricing cards, feature cards, FAQ rows
      xl: '16px',   // {rounded.xl} — product mockup cards
      xxl: '24px',  // {rounded.xxl} — oversized CTA banners
      pill: '9999px', // {rounded.pill} — tab toggles
      full: '9999px', // {rounded.full} — avatar circles
    },

    // ── Spacing ───────────────────────────────────────────────────────────────
    // All spacing tokens from DESIGN.md §Spacing System (base: 8px)
    // Prefixed with 'spacing-' so classes read: p-spacing-lg, gap-spacing-md, etc.
    spacing: {
      0: '0',
      'spacing-xxs': '4px',     // {spacing.xxs}
      'spacing-xs': '8px',      // {spacing.xs}
      'spacing-sm': '12px',     // {spacing.sm}
      'spacing-md': '16px',     // {spacing.md}
      'spacing-lg': '24px',     // {spacing.lg}
      'spacing-xl': '32px',     // {spacing.xl}
      'spacing-xxl': '48px',    // {spacing.xxl}
      'spacing-section': '96px', // {spacing.section}
      // Numeric scale for Tailwind layout utilities (w-*, h-*, etc.)
      '1': '4px',
      '2': '8px',
      '3': '12px',
      '4': '16px',
      '5': '20px',
      '6': '24px',
      '7': '28px',
      '8': '32px',
      '10': '40px',
      '11': '44px',
      '12': '48px',
      '14': '56px',
      '16': '64px',
      '20': '80px',
      '24': '96px',
      'auto': 'auto',
      'px': '1px',
      'full': '100%',
    },

    // ── Font Family ───────────────────────────────────────────────────────────
    // DESIGN.md §Typography + §Note on Font Substitutes
    // Saans first (prep for future license); Inter weight 500 as free fallback
    fontFamily: {
      sans: ['Saans', 'Saans Fallback', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['SaansMono', 'SaansMono Fallback', 'JetBrains Mono', 'ui-monospace', 'monospace'],
    },

    // ── Font Size + Line Height + Letter Spacing ───────────────────────────────
    // All typography tokens from DESIGN.md §Typography §Hierarchy
    fontSize: {
      // {typography.display-xl} — 72px / lh 1.05 / ls -2.0px
      'display-xl': ['72px', { lineHeight: '1.05', letterSpacing: '-2.0px' }],
      // {typography.display-lg} — 56px / lh 1.10 / ls -1.4px
      'display-lg': ['56px', { lineHeight: '1.10', letterSpacing: '-1.4px' }],
      // {typography.display-md} — 40px / lh 1.15 / ls -0.8px
      'display-md': ['40px', { lineHeight: '1.15', letterSpacing: '-0.8px' }],
      // {typography.headline} — 28px / lh 1.20 / ls -0.5px
      'headline': ['28px', { lineHeight: '1.20', letterSpacing: '-0.5px' }],
      // {typography.card-title} — 22px / lh 1.25 / ls -0.3px
      'card-title': ['22px', { lineHeight: '1.25', letterSpacing: '-0.3px' }],
      // {typography.subhead} — 20px / lh 1.40 / ls -0.2px
      'subhead': ['20px', { lineHeight: '1.40', letterSpacing: '-0.2px' }],
      // {typography.body-lg} — 18px / lh 1.50 / ls -0.1px
      'body-lg': ['18px', { lineHeight: '1.50', letterSpacing: '-0.1px' }],
      // {typography.body} — 16px / lh 1.50 / ls 0
      'body': ['16px', { lineHeight: '1.50', letterSpacing: '0' }],
      // {typography.body-sm} — 14px / lh 1.50 / ls 0
      'body-sm': ['14px', { lineHeight: '1.50', letterSpacing: '0' }],
      // {typography.caption} — 12px / lh 1.40 / ls 0
      'caption': ['12px', { lineHeight: '1.40', letterSpacing: '0' }],
      // {typography.button} — 15px / lh 1.20 / ls 0
      'button': ['15px', { lineHeight: '1.20', letterSpacing: '0' }],
      // {typography.eyebrow} — 14px / lh 1.30 / ls 0 (sentence case, NOT all-caps)
      'eyebrow': ['14px', { lineHeight: '1.30', letterSpacing: '0' }],
      // {typography.mono} — 13px / lh 1.50 / ls 0 (SaansMono for code in mockups)
      'mono': ['13px', { lineHeight: '1.50', letterSpacing: '0' }],
    },

    // ── Breakpoints ───────────────────────────────────────────────────────────
    // DESIGN.md §Responsive Behavior
    screens: {
      'mobile': '480px',    // single-column; display-xl scales
      'mobile-lg': '768px', // nav hamburger; pricing accordion
      'tablet': '1024px',   // card grid 3-up → 2-up
      'desktop': '1280px',  // max content width
      'desktop-xl': '1440px', // default desktop layout
    },

    extend: {
      // Max content width
      maxWidth: {
        content: '1280px',
      },
      // Minimum touch targets per DESIGN.md §Touch Targets
      minHeight: {
        'touch': '40px',
        'touch-input': '44px',
      },
    },
  },

  plugins: [],
};

export default config;
