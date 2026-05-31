import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) so we can grab GEMINI_API_KEY
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Inline the key as a compile-time constant — most reliable way to expose
    // a non-VITE_ env var to browser code without changing .env files.
    define: {
      __GEMINI_API_KEY__: JSON.stringify(env.GEMINI_API_KEY ?? ''),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
