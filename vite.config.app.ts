import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'
import { routeTypesPlugin } from './scripts/vite-plugin-route-types'
import { apiRoutesPlugin } from './scripts/vite-plugin-api'

// App-mode build config: produces index.html + assets into dist-app
export default defineConfig({
  build: {
    outDir: 'dist-app',
    // No lib mode here; Vite will use index.html as entry
  },
  server: {
    port: 5173,
    open: true
  },
  plugins: [
    routeTypesPlugin(), // Auto-generate route types for IDE autocomplete
    apiRoutesPlugin(), // Mount /api/* and generate type-safe $api client
    tailwindcss(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
      }
    }
  },
  resolve: {
    alias: {
      'auwla/jsx-runtime': resolve(__dirname, 'src/jsx-runtime.ts'),
      'auwla/jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts')
    }
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla'
  }
});