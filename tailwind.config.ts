import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper-cream background, very subtle.
        cream: {
          DEFAULT: '#F5F2EE',
          50: '#FAF8F5',
          100: '#F5F2EE',
          200: '#EDE8E1',
          300: '#E1DAD0',
        },
        // Near-black text with a slight cool undertone.
        ink: {
          DEFAULT: '#0E0E14',
          900: '#0E0E14',
          800: '#1A1A22',
          700: '#2C2C36',
          600: '#4A4A56',
          500: '#6E6E78',
          400: '#9A9AA3',
          300: '#C4C4CB',
          200: '#E0E0E5',
          100: '#EFEFF2',
          50: '#F7F7F9',
        },
        // .exd brand pink (CTA, dot accents, highlights).
        brand: {
          DEFAULT: '#E40066',
          50: '#FFE5EE',
          100: '#FFC2D6',
          200: '#FF8FB4',
          300: '#FB5C92',
          400: '#EE2A78',
          500: '#E40066',
          600: '#C0004F',
          700: '#950040',
        },
        // Teal accent (the .exd "." dot, used sparingly for "ok"/secondary).
        teal: {
          DEFAULT: '#19A398',
          50: '#E1F7F4',
          100: '#B5EAE2',
          200: '#7DD9CC',
          300: '#3FBFAF',
          400: '#19A398',
          500: '#0D8377',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      backgroundImage: {
        'blob-hero':
          'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(228,0,102,0.55) 0%, rgba(142,91,200,0.45) 35%, rgba(245,242,238,0) 70%)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(14,14,20,0.04), 0 8px 24px rgba(14,14,20,0.04)',
        pill: '0 4px 24px rgba(14,14,20,0.06), 0 1px 2px rgba(14,14,20,0.04)',
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
};

export default config;
