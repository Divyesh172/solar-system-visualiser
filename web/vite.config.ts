import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three';
          }
          if (
            id.includes('node_modules/astronomy-engine') ||
            id.includes('node_modules/satellite.js') ||
            id.includes('node_modules/suncalc')
          ) {
            return 'astronomy';
          }
        },
      },
    },
  },
});
