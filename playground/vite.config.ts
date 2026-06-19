import { defineConfig } from 'vite'
import { resolve } from 'path'
import { auwla } from 'auwla/vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [auwla({ serverEntry: './src/server.ts', ssr: true }), auwlaRouter({lazy:true})],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/.auwla/**', '**/auwla.gen.ts'],
    },
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: [
      { find: 'auwla/jsx-runtime', replacement: resolve(__dirname, '../src/jsx-runtime.ts') },
      { find: 'auwla/jsx-dev-runtime', replacement: resolve(__dirname, '../src/jsx-dev-runtime.ts') },
      { find: 'auwla/compiler', replacement: resolve(__dirname, '../src/compiler.ts') },
      { find: 'auwla/vite', replacement: resolve(__dirname, '../src/vite.ts') },
      { find: 'auwla/events', replacement: resolve(__dirname, '../src/events/index.ts') },
      { find: 'auwla/track', replacement: resolve(__dirname, '../src/track/index.ts') },
      { find: 'auwla/router', replacement: resolve(__dirname, '../src/router/index.ts') },
      { find: 'auwla/css', replacement: resolve(__dirname, '../src/css/index.ts') },
      { find: 'auwla/server', replacement: resolve(__dirname, '../src/server/index.ts') },
      { find: 'auwla/client', replacement: resolve(__dirname, '../src/client/rpc.ts') },
      { find: 'auwla/adapters/fetch', replacement: resolve(__dirname, '../src/adapters/fetch.ts') },
      { find: 'auwla/adapters/bun', replacement: resolve(__dirname, '../src/adapters/bun.ts') },
      { find: /^auwla$/, replacement: resolve(__dirname, '../src/index.ts') }
    ]
  }
})
