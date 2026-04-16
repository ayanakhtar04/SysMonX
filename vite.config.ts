import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = env.VITE_APP_BASE || '/';

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
  };
});
