import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, '.', '');
    var base = env.VITE_APP_BASE || '/';
    return {
        base: base,
        plugins: [react()],
        server: {
            port: 5173,
        },
        preview: {
            port: 4173,
        },
    };
});
