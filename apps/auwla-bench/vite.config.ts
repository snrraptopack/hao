import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5177 },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
})