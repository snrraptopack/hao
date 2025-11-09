import { defineConfig } from 'vite'
import { resolve } from 'path'

// Minimal Vite config for meta-test frontend harness
export default defineConfig({
  server: {
    port: 5174,
    open: true,
    // Proxy API calls to your Bun/Hono server (defaults to :3000)
    proxy: {
      // Use IPv4 to avoid Windows resolving localhost to ::1 (IPv6)
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      // Use local Auwla JSX runtimes so TSX works
      'auwla/jsx-runtime': resolve(__dirname, '../src/jsx-runtime.ts'),
      'auwla/jsx-dev-runtime': resolve(__dirname, '../src/jsx-dev-runtime.ts'),
      // Point auwla/meta to local source during development
      'auwla/meta': resolve(__dirname, '../src/meta/index.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla',
  },
})