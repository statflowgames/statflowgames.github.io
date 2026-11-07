import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: resolve(__dirname, '../../draft-test/sneaky-cat'),
    emptyOutDir: true,
    target: 'es2022',
  },
});
