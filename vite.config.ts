import { defineConfig } from 'vite';
import { resolve } from 'path';
import { auwla } from './src/vite';
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Auwla',
      fileName: (format) => `auwla.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es']
    },
    // Vite 8: rollupOptions is deprecated, use rolldownOptions
    rolldownOptions: {
      external: ['typescript', 'path', 'fs', 'node:fs', 'node:path', 'node:os', 'node:async_hooks', 'node:url', 'auwla/adapters/fetch'],
      input: {
        'auwla': resolve(__dirname, 'src/index.ts'),
        'compiler': resolve(__dirname, 'src/compiler.ts'),
        'vite': resolve(__dirname, 'src/vite.ts'),
        'events/index': resolve(__dirname, 'src/events/index.ts'),
        'track/index': resolve(__dirname, 'src/track/index.ts'),
        'router/index': resolve(__dirname, 'src/router/index.ts'),
        'css/index': resolve(__dirname, 'src/css/index.ts'),
        'vite-router/index': resolve(__dirname, 'src/vite-router/index.ts'),
        'jsx-runtime': resolve(__dirname, 'src/jsx-runtime.ts'),
        'jsx-dev-runtime': resolve(__dirname, 'src/jsx-dev-runtime.ts'),
        'server/index': resolve(__dirname, 'src/server/index.ts'),
        'client/rpc': resolve(__dirname, 'src/client/rpc.ts'),
        'adapters/fetch': resolve(__dirname, 'src/adapters/fetch.ts'),
        'adapters/hono': resolve(__dirname, 'src/adapters/hono.ts'),
        'adapters/bun': resolve(__dirname, 'src/adapters/bun.ts'),
        'adapters/express': resolve(__dirname, 'src/adapters/express.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        // Strip all comments (JSDoc, inline) from emitted .js files.
        // The .d.ts files produced by tsc --emitDeclarationOnly are separate
        // and retain full JSDoc for IDE hover support.
        comments: false,
      }
    }
  },
  server: {
    port: 5173,
    open: true
  },
  appType: 'spa',
  plugins: [
    auwla({ debugFlag: true, css: true }),
  ],
  assetsInclude: [],
  optimizeDeps: {
    exclude: [],
    include: [],
    // Vite 8: esbuildOptions is deprecated, use rolldownOptions
    // loader → moduleTypes
    rolldownOptions: {
      moduleTypes: {
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
      { find: 'auwla/track', replacement: resolve(__dirname, 'src/track/index.ts') },
      { find: 'auwla/router', replacement: resolve(__dirname, 'src/router/index.ts') },
      { find: 'auwla/css', replacement: resolve(__dirname, 'src/css/index.ts') },
      { find: /^auwla$/, replacement: resolve(__dirname, 'src/index.ts') }
    ]
  },
  // Vite 8: esbuild option replaced by oxc
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'auwla'
    }
  }
});
