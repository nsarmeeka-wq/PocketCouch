import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/** Port the FastAPI backend listens on (see backend/README.md). */
const API_PORT = process.env.POCKETCOACH_API_PORT ?? '8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Fail loudly instead of drifting to another port, so the URL people have
    // open (and any registered preview) never points at nothing.
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      // Same-origin in development: no CORS round trip, and the client can keep
      // using the relative `/api` base URL in every environment.
      '/api': {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
