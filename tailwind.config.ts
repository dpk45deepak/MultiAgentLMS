import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Kawaii Pastel Palette
        cream: {
          DEFAULT: '#FFF9EE',
          50: '#FFFCF7',
          100: '#FFF9EE',
          200: '#FFF2DB',
        },
        pastel: {
          blue: '#B9D9F5',
          'blue-light': '#D7EAFB',
          'blue-dark': '#8EBBE3',
          pink: '#F8C9D4',
          'pink-light': '#FDEAEF',
          peach: '#FFE2D0',
          yellow: '#FFE9A8',
          'yellow-light': '#FFF6D6',
          mint: '#D6EAD6',
          'mint-light': '#EDF7ED',
          lavender: '#E6DDF8',
          'lavender-light': '#F4EFFF',
        },
        navy: {
          DEFAULT: '#24364B',
          muted: '#6C7C91',
          faint: '#9BA8BA',
          light: '#435770',
        },
        // Mapped aliases for full application compatibility
        paper: '#FFF9EE',
        'paper-raised': '#FFFFFF',
        ink: '#24364B',
        'ink-soft': '#6C7C91',
        'ink-faint': '#9BA8BA',
        line: '#D7EAFB',
        'line-soft': '#EBF4FD',
        marker: {
          DEFAULT: '#5A9BD5',
          hover: '#4A8BC5',
          soft: '#D7EAFB',
          border: '#B9D9F5',
        },
        highlight: {
          DEFAULT: '#E5A93C',
          soft: '#FFE9A8',
        },
        flag: {
          DEFAULT: '#E57388',
          soft: '#F8C9D4',
        },
        brand: {
          50: '#D7EAFB',
          100: '#CBE2F9',
          200: '#B9D9F5',
          300: '#9EC8EE',
          400: '#7CB2E4',
          500: '#5A9BD5',
          600: '#3D82C4',
          700: '#2A66A3',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Fredoka', 'sans-serif'],
        serif: ['var(--font-heading)', 'Fredoka', 'sans-serif'],
        sans: ['var(--font-sans)', 'Nunito', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '12px',
        md: '14px',
        lg: '18px',
        xl: '22px',
        '2xl': '26px',
        '3xl': '32px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(36, 54, 75, 0.05)',
        card: '0 4px 14px -2px rgba(36, 54, 75, 0.06), 0 2px 4px -1px rgba(36, 54, 75, 0.03)',
        'card-hover': '0 8px 24px -4px rgba(36, 54, 75, 0.1), 0 4px 8px -2px rgba(36, 54, 75, 0.05)',
        raised: '0 12px 30px -4px rgba(36, 54, 75, 0.1), 0 4px 10px -2px rgba(36, 54, 75, 0.04)',
        window: '0 10px 30px -5px rgba(36, 54, 75, 0.12), 0 4px 12px -2px rgba(36, 54, 75, 0.06)',
        retro: '2px 2px 0px 0px rgba(36, 54, 75, 0.15)',
        'retro-btn': '0 3px 0 0 #9EC8EE',
        'retro-btn-active': '0 1px 0 0 #9EC8EE',
        'retro-pink': '0 3px 0 0 #F3A8B9',
        sticky: '2px 4px 12px rgba(36, 54, 75, 0.08), 0 1px 3px rgba(36, 54, 75, 0.05)',
        glow: '0 0 25px -4px rgba(185, 217, 245, 0.6)',
      },
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'draw-line': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.2) rotate(15deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
      animation: {
        reveal: 'reveal 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'draw-line': 'draw-line 0.5s ease-out both',
        float: 'float 4s ease-in-out infinite',
        sparkle: 'sparkle 2.5s ease-in-out infinite',
        wiggle: 'wiggle 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
