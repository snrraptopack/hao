import { defineConfig } from 'vite';
export default defineConfig({ server: { port: 5179 }, build: { target: 'esnext' } });