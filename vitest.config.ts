import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      { find: 'auwla/jsx-runtime', replacement: fileURLToPath(new URL('./src/jsx-runtime.ts', import.meta.url)) },
      { find: 'auwla/jsx-dev-runtime', replacement: fileURLToPath(new URL('./src/jsx-dev-runtime.ts', import.meta.url)) },
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
    include: ['tests/memo-dom.test.ts', 'tests/jsx-dom.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/index.ts',
        'src/jsx.ts',
        'src/jsx-runtime.ts',
        'src/jsx-dev-runtime.ts',
        'src/memo-dom.ts',
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
