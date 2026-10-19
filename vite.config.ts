import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the production build run from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
