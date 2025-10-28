import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5173 },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
})