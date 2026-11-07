import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: resolve(__dirname, '../../draft-test/evolution-lab'),
    emptyOutDir: true,
    target: 'es2022',
  },
});
