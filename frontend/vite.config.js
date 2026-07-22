import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in current working directory and parent directory for monorepos
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || '';

  return {
    plugins: [react()],
    define: {
      ...(apiUrl ? { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl) } : {})
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
