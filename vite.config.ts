import { defineConfig } from 'vite';
import { resolve } from 'path';

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
        'jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts')
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
  plugins: [],
  assetsInclude: [],
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
  resolve: {
    alias: [
      { find: 'auwla/jsx-runtime', replacement: resolve(__dirname, 'src/jsx-runtime.ts') },
      { find: 'auwla/jsx-dev-runtime', replacement: resolve(__dirname, 'src/jsx-dev-runtime.ts') },
      { find: /^auwla$/, replacement: resolve(__dirname, 'src/index.ts') }
    ]
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla'
  }
});
