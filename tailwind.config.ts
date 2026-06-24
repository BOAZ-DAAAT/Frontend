import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          500: '#3478f6',
          600: '#2463db',
          700: '#1d4fb7',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
