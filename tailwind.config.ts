import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#343434',
        },

        background: {
          main: '#E7E7E7',
          dot: '#FFFFFF'
        },

        surface: '#FFFFFF',

      },
    },
  },
  plugins: [],
} satisfies Config;
