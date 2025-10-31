import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.test.*',
        'src/app/**',
        'src/integrations/**',
        'src/devtools-demo.tsx',
        'src/style.css',
        'src/cli.ts',
        'src/app.ts',
        'src/routes.ts',
        'src/devtools-ui.ts',
        'src/jsxutils.tsx',
      ],
    },
    exclude: [
      'dist/**',
      'dist-app/**',
      'node_modules/**',
      'apps/**',
      'website/**',
      'react-interop/**',
      'create-auwla/**',
      'docs/**',
      '**/templates/**',
    ],
  },
})