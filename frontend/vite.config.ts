import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Basic Vite configuration for React 18.  The app uses ESM modules
// and does not rely on any global variables.  Additional plugins can
// be configured here as needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
});