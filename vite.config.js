import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Critical: Makes paths relative so Electron can find files
  build: {
    outDir: 'dist'
  }
});