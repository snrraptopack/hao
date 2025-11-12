import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    tailwindcss(),
    compression({ algorithm: 'brotliCompress' }),
    compression({ algorithm: 'gzip' }),
  ],
  server: { port: 5177,host:true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          prism: ['prismjs'],
        }
      }
    }
  }
})
