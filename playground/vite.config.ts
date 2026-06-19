import { defineConfig } from 'vite'
import { auwla } from 'auwla/vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [auwla(), auwlaRouter({lazy:true})],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/.auwla/**', '**/auwla.gen.ts'],
    },
  },
  build: {
    outDir: 'dist',
  },
})
