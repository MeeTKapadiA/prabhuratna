import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Only inject custom VITE_API_URL if explicitly provided in environment during build or dev
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || '';

  return {
    plugins: [react()],
    define: {
      // In development mode (command === 'serve'), if VITE_API_URL is not set, default to empty string so it uses '/api' proxy
      ...(command === 'build' && apiUrl ? { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl) } : {})
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true
        }
      }
    }
  };
});
