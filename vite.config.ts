import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'
import { templateCompiler } from './template/compiler/vite-plugin';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Auwla',
      fileName: (format) => `auwla.${format === 'es' ? 'js' : 'umd.cjs'}`
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    port: 5173,
    open: true
  },
  plugins: [
    tailwindcss(),
    templateCompiler()
  ]
});
