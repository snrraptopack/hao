import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'
import { routeTypesPlugin } from './scripts/vite-plugin-route-types'


export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Auwla',
      fileName: (format) => `auwla.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es']
    },
    rollupOptions: {
      input: {
        'auwla': resolve(__dirname, 'src/index.ts'),
        'jsx-runtime': resolve(__dirname, 'src/jsx-runtime.ts'),
        'jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts'),
        'transition/index': resolve(__dirname, 'src/transition/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        inlineDynamicImports: false
      }
    }
  },
  server: {
    port: 5173,
    open: true
  },
  plugins: [
    routeTypesPlugin(), // Auto-generate route types for IDE autocomplete
    tailwindcss(),
    //templateCompiler({ verbose: false, emitDebugFiles: true })
  ],
  // Ensure .auwla files are treated as modules, not assets
  assetsInclude: [],
  // Configure Vite to handle .auwla files and JSX
  optimizeDeps: {
    exclude: [],
    include: [],
    esbuildOptions: {
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
      }
    }
  },
  // Add alias to resolve 'auwla' imports to the local src
  resolve: {
    alias: {
      'auwla/jsx-runtime': resolve(__dirname, 'src/jsx-runtime.ts'),
      'auwla/jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts')
    }
  },
  // Configure esbuild to handle JSX with our custom runtime
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla'
  }
});
