import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: resolve(__dirname, '../../draft-test/mini-dungeon-digger'),
    emptyOutDir: true,
    target: 'es2022',
  },
});
