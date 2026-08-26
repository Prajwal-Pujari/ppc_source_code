import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import tailwindcss from '@tailwindcss/vite';  // ← also add this, it was missing!
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],  // ← tailwindcss() was missing from plugins!
  define: {
    global: 'globalThis',  // ← THIS fixes the sockjs-client crash
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:9091',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});