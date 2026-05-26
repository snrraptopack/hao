import { defineConfig } from 'vite';
import { resolve } from 'path';
import { compileAuwla } from './src/compiler';

function auwlaCompiler() {
  return {
    name: 'auwla-compiler',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!/\.[tj]sx$/.test(id)) return null;
      if (id.includes('/node_modules/') || id.includes('\\node_modules\\')) return null;
      if (id.includes('-runtime')) return null;
      const compiled = compileAuwla(code, id);
      return compiled === code ? null : { code: compiled, map: null };
    },
  };
}

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
  plugins: [auwlaCompiler()],
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
      { find: /^auwla$/, replacement: resolve(__dirname, 'src/index.ts') }
    ]
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla'
  }
});
