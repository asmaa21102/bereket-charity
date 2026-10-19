import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Built into the Laravel app (public/app) so the API and the app share one origin
// (the session cookie works without CORS). `npm run dev` proxies the API to :8103.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    base: '/app/',
    build: { outDir: '../public/app', emptyOutDir: true },
    server: {
        port: 5180,
        proxy: { '/api': 'http://localhost:8103', '/sanctum': 'http://localhost:8103', '/storage': 'http://localhost:8103' },
    },
});
