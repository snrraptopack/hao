import { defineConfig } from 'vite';
import { resolve } from 'path';
import { auwla } from 'auwla/vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Auwla',
      fileName: (format) => `auwla.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es']
    },
    rollupOptions: {
      external: ['typescript'],
      input: {
        'auwla': resolve(__dirname, 'src/index.ts'),
        'compiler': resolve(__dirname, 'src/compiler.ts'),
        'vite': resolve(__dirname, 'src/vite.ts'),
        'events/index': resolve(__dirname, 'src/events/index.ts'),
        'router/index': resolve(__dirname, 'src/router/index.ts'),
        'css/index': resolve(__dirname, 'src/css/index.ts'),
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
  appType: "spa" ,
  plugins: [auwla({ debugFlag: true })],
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
      { find: 'auwla/compiler', replacement: resolve(__dirname, 'src/compiler.ts') },
      { find: 'auwla/vite', replacement: resolve(__dirname, 'src/vite.ts') },
      { find: 'auwla/events', replacement: resolve(__dirname, 'src/events/index.ts') },
      { find: 'auwla/router', replacement: resolve(__dirname, 'src/router/index.ts') },
      { find: 'auwla/css', replacement: resolve(__dirname, 'src/css/index.ts') },
      { find: /^auwla$/, replacement: resolve(__dirname, 'src/index.ts') }
    ]
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla'
  }
});
