import type { Config } from 'tailwindcss';

// Tokens da marca Copa Jumentus 2027 (docs/marca/manual-de-marca.md), definidos em globals.css.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: {
          1: 'var(--surface1)',
          2: 'var(--surface2)',
          3: 'var(--surface3)',
        },
        text: {
          1: 'var(--text1)',
          2: 'var(--text2)',
          3: 'var(--text3)',
          4: 'var(--text4)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          subtle: 'var(--accent-subtle)',
          orange: 'var(--accent-orange)',
          violet: 'var(--accent-violet)',
          armor: 'var(--accent-armor)',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
          text: 'var(--success-text)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
          text: 'var(--warning-text)',
        },
        error: {
          DEFAULT: 'var(--error)',
          bg: 'var(--error-bg)',
          text: 'var(--error-text)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        hud: 'var(--panel-stroke)',
        visible: 'var(--border-visible)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
        numero: 'var(--font-numero)',
      },
      fontSize: {
        display: ['56px', { lineHeight: '0.92', letterSpacing: '0.01em' }],
        heading: ['34px', { lineHeight: '0.95', letterSpacing: '0.01em' }],
        subheading: ['20px', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        body: ['15px', { lineHeight: '1.55' }],
        'body-sm': ['13px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        label: ['11px', { lineHeight: '1.2', letterSpacing: '0.12em' }],
      },
      borderRadius: {
        hud: 'var(--radius-hud)',
        element: 'var(--radius-element)',
        component: 'var(--radius-component)',
        container: 'var(--radius-container)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      backgroundImage: {
        leonida: 'var(--gradient-leonida)',
        dusk: 'var(--gradient-dusk)',
        glow: 'var(--gradient-glow)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },
      transitionTimingFunction: {
        hud: 'var(--ease)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        medium: 'var(--duration-medium)',
        slow: 'var(--duration-slow)',
      },
    },
  },
  plugins: [],
};

export default config;
