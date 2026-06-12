import { defineConfig } from 'vite';

export default defineConfig({
  base: '/finance-control-web/',
  build: {
    target: 'es2022',
    outDir: 'docs',
    emptyOutDir: true,
  },
});
