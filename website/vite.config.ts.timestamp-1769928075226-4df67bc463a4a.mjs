// vite.config.ts
import { defineConfig } from "file:///C:/Users/babyface/Desktop/coding/nw-app/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.24_lightningcss@1.30.2_terser@5.44.0/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "url";
import tailwindcss from "file:///C:/Users/babyface/Desktop/coding/nw-app/node_modules/.pnpm/@tailwindcss+vite@4.1.16_vite@5.4.21_@types+node@20.19.24_lightningcss@1.30.2_terser@5.44.0_/node_modules/@tailwindcss/vite/dist/index.mjs";
import compression from "file:///C:/Users/babyface/Desktop/coding/nw-app/node_modules/.pnpm/vite-plugin-compression@0.5.1_vite@5.4.21_@types+node@20.19.24_lightningcss@1.30.2_terser@5.44.0_/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///C:/Users/babyface/Desktop/coding/nw-app/website/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    tailwindcss(),
    compression({ algorithm: "brotliCompress" }),
    compression({ algorithm: "gzip" })
  ],
  server: { port: 5177, host: true },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment"
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          prism: ["prismjs"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxiYWJ5ZmFjZVxcXFxEZXNrdG9wXFxcXGNvZGluZ1xcXFxudy1hcHBcXFxcd2Vic2l0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYmFieWZhY2VcXFxcRGVza3RvcFxcXFxjb2RpbmdcXFxcbnctYXBwXFxcXHdlYnNpdGVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2JhYnlmYWNlL0Rlc2t0b3AvY29kaW5nL253LWFwcC93ZWJzaXRlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXHJcbmltcG9ydCBjb21wcmVzc2lvbiBmcm9tICd2aXRlLXBsdWdpbi1jb21wcmVzc2lvbidcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB0YWlsd2luZGNzcygpLFxyXG4gICAgY29tcHJlc3Npb24oeyBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycgfSksXHJcbiAgICBjb21wcmVzc2lvbih7IGFsZ29yaXRobTogJ2d6aXAnIH0pLFxyXG4gIF0sXG4gIHNlcnZlcjogeyBwb3J0OiA1MTc3LGhvc3Q6dHJ1ZSB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgIH1cbiAgfSxcbiAgZXNidWlsZDoge1xuICAgIGpzeEZhY3Rvcnk6ICdoJyxcbiAgICBqc3hGcmFnbWVudDogJ0ZyYWdtZW50J1xuICB9LFxuICBidWlsZDoge1xyXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgIG1pbmlmeTogJ3RlcnNlcicsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgcHJpc206IFsncHJpc21qcyddLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlUsU0FBUyxvQkFBb0I7QUFDMVcsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxpQkFBaUI7QUFIMkwsSUFBTSwyQ0FBMkM7QUFLcFEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsWUFBWTtBQUFBLElBQ1osWUFBWSxFQUFFLFdBQVcsaUJBQWlCLENBQUM7QUFBQSxJQUMzQyxZQUFZLEVBQUUsV0FBVyxPQUFPLENBQUM7QUFBQSxFQUNuQztBQUFBLEVBQ0EsUUFBUSxFQUFFLE1BQU0sTUFBSyxNQUFLLEtBQUs7QUFBQSxFQUMvQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLElBQ3REO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsWUFBWTtBQUFBLElBQ1osYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGNBQWM7QUFBQSxJQUNkLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLE9BQU8sQ0FBQyxTQUFTO0FBQUEsUUFDbkI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
