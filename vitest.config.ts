import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      { find: 'auwla/jsx-runtime', replacement: fileURLToPath(new URL('./src/jsx-runtime.ts', import.meta.url)) },
      { find: 'auwla/jsx-dev-runtime', replacement: fileURLToPath(new URL('./src/jsx-dev-runtime.ts', import.meta.url)) },
      { find: 'auwla/compiler', replacement: fileURLToPath(new URL('./src/compiler.ts', import.meta.url)) },
      { find: /^auwla$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) },
    ],
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/memo-dom.test.ts',
      'tests/compiler-runtime.test.tsx',
      'tests/compiler/**/*.test.ts',
      'tests/compiler-runtime/**/*.test.ts',
      'tests/shared/**/*.test.ts',
      'tests/runtime/**/*.test.ts',
      'tests/runtime/**/*.test.tsx',
      'tests/perf.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/index.ts',
        'src/jsx.ts',
        'src/jsx-runtime.ts',
        'src/jsx-dev-runtime.ts',
        'src/memo-dom.ts',
        'src/compiler-runtime.ts',
        'src/compiler.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.test.*',
      ],
    },
    exclude: [
      'dist/**',
      'node_modules/**',
    ],
  },
})
