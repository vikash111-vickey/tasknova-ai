/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#000000', // Pure black AXON
        axon: {
          bg: '#000000',
          accent: '#aa88ff',
          text: '#dddddd',
          muted: '#8a8a8a',
          chip: '#1c1c1c',
          line: '#2a2a2a',
          surface: '#0a0a0a',
        },
        surface: {
          50: '#141416',
          100: '#101012',
          200: '#0c0c0e',
          300: '#08080a',
          950: '#050507',
          DEFAULT: '#0a0a0a',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          400: '#c4b5fd',
          500: '#aa88ff', // AXON lavender accent
          600: '#8b5cf6',
          700: '#7c3aed',
          900: '#4c1d95',
          purple: '#aa88ff',
          'purple-light': '#c4b5fd',
          cyan: '#2dd4bf',
        },
        accent: {
          cyan: '#2dd4bf',
          purple: '#aa88ff',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', '"JetBrains Mono"', 'Inter', 'monospace'],
        mono: ['"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', '"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.02em',
        wider: '0.05em',
        widest: '0.1em',
      },
      boxShadow: {
        'glow-accent': '0 0 25px -4px rgba(170, 136, 255, 0.45)',
        'glow-purple': '0 0 25px -4px rgba(170, 136, 255, 0.45)',
        'glow-cyan': '0 0 25px -5px rgba(45, 212, 191, 0.35)',
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'glow-red': '0 0 25px -5px rgba(244, 63, 94, 0.35)',
      },
      transitionTimingFunction: {
        axon: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
