import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'

// App-mode build config: produces index.html + assets into dist-app
export default defineConfig({
  build: {
    outDir: 'dist-app',
    // No lib mode here; Vite will use index.html as entry
  },
  server: {
    port: 5173,
    open: true
  },
  plugins: [
    tailwindcss(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
      }
    }
  },
  resolve: {
    alias: {
      'auwla': resolve(__dirname, 'src/index.ts')
    }
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
});