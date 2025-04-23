// src/renderer/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Required for Electron to load assets correctly
  build: {
    outDir: '../../dist/renderer', // Output to the correct location for Electron
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});