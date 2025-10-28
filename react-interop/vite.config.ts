import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5176, open: true },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.tsx': 'tsx', '.ts': 'ts' }
    }
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla'
  }
});