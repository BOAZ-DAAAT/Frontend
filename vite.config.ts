import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        // svgo는 최적화만, 색 변형(convertColors)은 꺼서 아래 replaceAttrValues가 원본 색과 매칭되게 함
        svgo: true,
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: { overrides: { convertColors: false, removeViewBox: false } },
            },
          ],
        },
        // 아이콘 고정색 → currentColor (CSS color로 제어 가능하게)
        replaceAttrValues: {
          '#323232': 'currentColor',
          '#1A1A1A': 'currentColor',
          black: 'currentColor',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
