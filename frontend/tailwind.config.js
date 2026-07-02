export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#eef8ff',
          100: '#d9efff',
          200: '#b3e0fc',
          300: '#7cc4f0',
          400: '#3ba3e3',
          500: '#147bd1',
          600: '#0d63ad',
          700: '#0a528f',
          800: '#084269',
          900: '#082f49'
        },
        mint: '#10b981',
        ink: '#102033',
        // Semantic tokens — resolve to CSS variables defined in styles.css so
        // components stop hardcoding hex and light/dark stay in sync. Use like
        // bg-surface, text-foreground, border-line, text-muted, bg-primary.
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted-foreground)',
        line: 'var(--border)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        accent: 'var(--accent)',
        ring: 'var(--ring)'
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        // Consistent elevation scale — use e1 (cards) through e4 (modals/hero)
        // instead of ad-hoc shadow values, so depth reads consistently.
        soft: '0 18px 60px rgba(8, 47, 73, 0.12)',
        e1: '0 1px 2px rgba(8, 47, 73, 0.06), 0 1px 3px rgba(8, 47, 73, 0.08)',
        e2: '0 4px 12px rgba(8, 47, 73, 0.08), 0 2px 4px rgba(8, 47, 73, 0.06)',
        e3: '0 12px 28px rgba(8, 47, 73, 0.12), 0 4px 8px rgba(8, 47, 73, 0.06)',
        e4: '0 24px 60px rgba(8, 47, 73, 0.16), 0 8px 16px rgba(8, 47, 73, 0.08)'
      },
      transitionTimingFunction: {
        // Shared easing so all motion feels like one system (matches utils/motion.js).
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
};
