import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'
// import react from '@vitejs/plugin-react'; // Commented out to use custom JSX runtime


export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Auwla',
      fileName: (format) => `auwla.${format === 'es' ? 'js' : 'umd.cjs'}`
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    port: 5173,
    open: true
  },
  plugins: [
    tailwindcss(),
    // react(), // Commented out to use custom JSX runtime
    //templateCompiler({ verbose: false, emitDebugFiles: true })
  ],
  // Ensure .auwla files are treated as modules, not assets
  assetsInclude: [],
  // Configure Vite to handle .auwla files and JSX
  optimizeDeps: {
    exclude: ['**/*.auwla'],
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
      'auwla': resolve(__dirname, 'src/index.ts')
    }
  },
  // Configure esbuild to handle JSX with our custom runtime
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
});
