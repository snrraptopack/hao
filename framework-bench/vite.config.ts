import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5177
  },
  build: {
    target: 'esnext'
  },
  resolve: {
    alias: {
      'auwla': resolve(__dirname, '../src/index.ts')
    }
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
      }
    }
  }
});