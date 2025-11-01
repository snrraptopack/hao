// vite.config.ts
import { defineConfig } from "file:///C:/Users/babyface/Desktop/coding/nw-app/node_modules/.pnpm/vite@5.4.21_lightningcss@1.30.2_terser@5.44.0/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import tailwindcss from "file:///C:/Users/babyface/Desktop/coding/nw-app/node_modules/.pnpm/@tailwindcss+vite@4.1.16_vite@5.4.21_lightningcss@1.30.2_terser@5.44.0_/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\babyface\\Desktop\\coding\\nw-app";
var vite_config_default = defineConfig({
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      name: "Auwla",
      fileName: (format) => `auwla.${format === "es" ? "js" : "umd.cjs"}`
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: ["react", "react-dom", "react-dom/client"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-dom/client": "ReactDOM"
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  },
  plugins: [
    tailwindcss()
    // react(), // Commented out to use custom JSX runtime
    //templateCompiler({ verbose: false, emitDebugFiles: true })
  ],
  // Ensure .auwla files are treated as modules, not assets
  assetsInclude: [],
  // Configure Vite to handle .auwla files and JSX
  optimizeDeps: {
    exclude: ["**/*.auwla", "react", "react-dom", "react-dom/client"],
    esbuildOptions: {
      loader: {
        ".tsx": "tsx",
        ".ts": "ts"
      }
    }
  },
  // Add alias to resolve 'auwla' imports to the local src
  resolve: {
    alias: {
      "auwla/jsx-runtime": resolve(__vite_injected_original_dirname, "src/jsx-runtime.ts"),
      "auwla/jsx-dev-runtime": resolve(__vite_injected_original_dirname, "src/jsx-dev-runtime.ts")
    }
  },
  // Configure esbuild to handle JSX with our custom runtime
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "auwla"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxiYWJ5ZmFjZVxcXFxEZXNrdG9wXFxcXGNvZGluZ1xcXFxudy1hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGJhYnlmYWNlXFxcXERlc2t0b3BcXFxcY29kaW5nXFxcXG53LWFwcFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYmFieWZhY2UvRGVza3RvcC9jb2RpbmcvbnctYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xyXG4vLyBpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnOyAvLyBDb21tZW50ZWQgb3V0IHRvIHVzZSBjdXN0b20gSlNYIHJ1bnRpbWVcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGJ1aWxkOiB7XHJcbiAgICBsaWI6IHtcclxuICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2luZGV4LnRzJyksXHJcbiAgICAgIG5hbWU6ICdBdXdsYScsXHJcbiAgICAgIGZpbGVOYW1lOiAoZm9ybWF0KSA9PiBgYXV3bGEuJHtmb3JtYXQgPT09ICdlcycgPyAnanMnIDogJ3VtZC5janMnfWBcclxuICAgIH0sXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIC8vIEV4dGVybmFsaXplIGRlcHMgdGhhdCBzaG91bGRuJ3QgYmUgYnVuZGxlZFxyXG4gICAgICBleHRlcm5hbDogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3QtZG9tL2NsaWVudCddLFxyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBnbG9iYWxzOiB7XHJcbiAgICAgICAgICByZWFjdDogJ1JlYWN0JyxcclxuICAgICAgICAgICdyZWFjdC1kb20nOiAnUmVhY3RET00nLFxyXG4gICAgICAgICAgJ3JlYWN0LWRvbS9jbGllbnQnOiAnUmVhY3RET00nXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDUxNzMsXHJcbiAgICBvcGVuOiB0cnVlXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICB0YWlsd2luZGNzcygpLFxyXG4gICAgLy8gcmVhY3QoKSwgLy8gQ29tbWVudGVkIG91dCB0byB1c2UgY3VzdG9tIEpTWCBydW50aW1lXHJcbiAgICAvL3RlbXBsYXRlQ29tcGlsZXIoeyB2ZXJib3NlOiBmYWxzZSwgZW1pdERlYnVnRmlsZXM6IHRydWUgfSlcclxuICBdLFxyXG4gIC8vIEVuc3VyZSAuYXV3bGEgZmlsZXMgYXJlIHRyZWF0ZWQgYXMgbW9kdWxlcywgbm90IGFzc2V0c1xyXG4gIGFzc2V0c0luY2x1ZGU6IFtdLFxyXG4gIC8vIENvbmZpZ3VyZSBWaXRlIHRvIGhhbmRsZSAuYXV3bGEgZmlsZXMgYW5kIEpTWFxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgZXhjbHVkZTogWycqKi8qLmF1d2xhJywgJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1kb20vY2xpZW50J10sXHJcbiAgICBlc2J1aWxkT3B0aW9uczoge1xyXG4gICAgICBsb2FkZXI6IHtcclxuICAgICAgICAnLnRzeCc6ICd0c3gnLFxyXG4gICAgICAgICcudHMnOiAndHMnXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIC8vIEFkZCBhbGlhcyB0byByZXNvbHZlICdhdXdsYScgaW1wb3J0cyB0byB0aGUgbG9jYWwgc3JjXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ2F1d2xhL2pzeC1ydW50aW1lJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvanN4LXJ1bnRpbWUudHMnKSxcclxuICAgICAgJ2F1d2xhL2pzeC1kZXYtcnVudGltZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2pzeC1kZXYtcnVudGltZS50cycpXHJcbiAgICB9XHJcbiAgfSxcclxuICAvLyBDb25maWd1cmUgZXNidWlsZCB0byBoYW5kbGUgSlNYIHdpdGggb3VyIGN1c3RvbSBydW50aW1lXHJcbiAgZXNidWlsZDoge1xyXG4gICAganN4OiAnYXV0b21hdGljJyxcclxuICAgIGpzeEltcG9ydFNvdXJjZTogJ2F1d2xhJ1xyXG4gIH1cclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVQsU0FBUyxvQkFBb0I7QUFDaFYsU0FBUyxlQUFlO0FBQ3hCLE9BQU8saUJBQWlCO0FBRnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsTUFDeEMsTUFBTTtBQUFBLE1BQ04sVUFBVSxDQUFDLFdBQVcsU0FBUyxXQUFXLE9BQU8sT0FBTyxTQUFTO0FBQUEsSUFDbkU7QUFBQSxJQUNBLGVBQWU7QUFBQTtBQUFBLE1BRWIsVUFBVSxDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxNQUNuRCxRQUFRO0FBQUEsUUFDTixTQUFTO0FBQUEsVUFDUCxPQUFPO0FBQUEsVUFDUCxhQUFhO0FBQUEsVUFDYixvQkFBb0I7QUFBQSxRQUN0QjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLFlBQVk7QUFBQTtBQUFBO0FBQUEsRUFHZDtBQUFBO0FBQUEsRUFFQSxlQUFlLENBQUM7QUFBQTtBQUFBLEVBRWhCLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxJQUNoRSxnQkFBZ0I7QUFBQSxNQUNkLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLE9BQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wscUJBQXFCLFFBQVEsa0NBQVcsb0JBQW9CO0FBQUEsTUFDNUQseUJBQXlCLFFBQVEsa0NBQVcsd0JBQXdCO0FBQUEsSUFDdEU7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLEtBQUs7QUFBQSxJQUNMLGlCQUFpQjtBQUFBLEVBQ25CO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
