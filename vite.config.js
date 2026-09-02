import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Proxies any requests starting with /api to the backend server
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
});
