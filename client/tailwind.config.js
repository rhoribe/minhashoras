/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        app: {
          bg: 'var(--app-bg)',
          surface: 'var(--app-surface)',
          'surface-elevated': 'var(--app-surface-elevated)',
          border: 'var(--app-border)',
          'border-hover': 'var(--app-border-hover)',
          'text-primary': 'var(--app-text-primary)',
          'text-secondary': 'var(--app-text-secondary)',
          'text-muted': 'var(--app-text-muted)',
          'brand-primary': 'var(--app-brand-primary)',
          'brand-hover': 'var(--app-brand-hover)',
          'brand-surface': 'var(--app-brand-surface)',
          'brand-text': 'var(--app-brand-text)',
          danger: 'var(--app-danger)',
          'danger-surface': 'var(--app-danger-surface)',
          warning: 'var(--app-warning)',
          'warning-surface': 'var(--app-warning-surface)',
        },
        surface: {
          light: '#ffffff',
          dark: '#0f172a',
          'elevated-light': '#f1f5f9',
          'elevated-dark': '#1e293b'
        }
      },
      width: {
        sidebar: '256px',
      },
      maxWidth: {
        '7xl': '80rem',
      },
      padding: {
        'safe-bottom': 'env(safe-area-inset-bottom, 16px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
}
