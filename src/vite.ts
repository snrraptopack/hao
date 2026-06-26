import type { Plugin } from 'vite';
import { compileAuwla } from './compiler';
import { ViteCSSHandler, RESOLVED_ID } from './vite-css';
import { clearThemeCache } from './css/compiler/css-compiler';

import { type AuwlaConfig } from './config';

export type AuwlaViteOptions = AuwlaConfig;

function normalizeId(id: string): string {
  return id.split('?', 1)[0] ?? id;
}

function markerCode(value: boolean, debugFlag: boolean | string | undefined): string {
  if (!debugFlag) return '';
  const name = typeof debugFlag === 'string' ? debugFlag : '__AUWLA_COMPILED__';
  return `globalThis.${name} = ${value};\n`;
}

function isTrackedStyleFile(file: string): boolean {
  return file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx');
}

export function auwla(options: AuwlaViteOptions = {}): Plugin {
  let cssHandler: ViteCSSHandler;
  let viteConfig: any;

  return {
    name: 'auwla',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
      cssHandler = new ViteCSSHandler(!!options.compiler?.css, !!options.compiler?.debugFlag);
    },

    async config(viteConfig, env) {
      const { loadConfigFromFile } = await import('vite');
      const fs = await import('node:fs');
      const path = await import('node:path');
      const root = viteConfig.root || process.cwd();
      
      let loaded = null;
      if (fs.existsSync(path.resolve(root, 'auwla.config.ts'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.ts', root);
      } else if (fs.existsSync(path.resolve(root, 'auwla.config.js'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.js', root);
      } else if (fs.existsSync(path.resolve(root, 'auwla.config.mjs'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.mjs', root);
      }

      if (loaded) {
        Object.assign(options, loaded.config);
      }
    },

    async closeBundle() {
      // Automatic two-pass build orchestration
      if (
        options.server?.entry &&
        !viteConfig.build.ssr &&
        process.env.AUWLA_SKIP_SSR_BUILD !== 'true'
      ) {
        process.env.AUWLA_SKIP_SSR_BUILD = 'true';
        console.log('\n[auwla] Client build complete. Automatically starting server build...');
        
        try {
          const vite = await import('vite');
          await vite.build({
            configFile: viteConfig.configFile,
            build: {
              ssr: options.server.entry,
              outDir: 'dist/server',
              emptyOutDir: false,
            }
          });
        } catch (e) {
          console.error('[auwla] Failed to run automatic SSR build', e);
        }
      }
    },

    async configureServer(server) {
      cssHandler.setServer(server);
      ;(globalThis as any).__auwla_vite_server = server;
      ;(globalThis as any).__auwla_vite_css_handler = cssHandler;
      if (options.server?.entry) {
        console.log('[auwla:vite] configureServer running, serverEntry:', options.server?.entry)
        const { createDevServerMiddleware } = await import('./dev-middleware.js')
        const middleware = await createDevServerMiddleware(server, options.server.entry)
        server.middlewares.use(middleware)
        console.log('[auwla:vite] dev middleware registered!')
      }
    },

    /**
     * Vite 6+ environment-aware HMR hook.
     * Ensures the aggregated CSS virtual module is invalidated and included
     * in the update whenever a tracked source file changes.
     */
    hotUpdate(options) {
      const { file, modules } = options;

      if (file.includes('theme') || isTrackedStyleFile(file)) {
        clearThemeCache();
      }

      if (!cssHandler.isEnabled()) {
        return modules;
      }

      const cssMod = this.environment.moduleGraph.getModuleById(RESOLVED_ID);
      if (cssMod) {
        this.environment.moduleGraph.invalidateModule(cssMod);
        return [...modules, cssMod];
      }

      return modules;
    },

    /**
     * Legacy HMR hook for Vite 5 and early Vite 6 projects.
     * Does the same CSS-virtual-module invalidation via the root server graph.
     */
    handleHotUpdate({ file, server, modules }) {
      if (file.includes('theme') || isTrackedStyleFile(file)) {
        clearThemeCache();
      }

      if (!cssHandler.isEnabled()) {
        return modules;
      }

      const cssMod = server?.moduleGraph?.getModuleById(RESOLVED_ID);
      if (cssMod) {
        server.moduleGraph.invalidateModule(cssMod);
        return [...modules, cssMod];
      }

      return modules;
    },

    watchChange(id, change) {
      if (change.event === 'delete') {
        cssHandler.deleteFile(id);
      }
    },

    resolveId(source, _importer, _options) {
      return cssHandler.resolveId(source);
    },

    load(id) {
      return cssHandler.load(id);
    },

    transform(code, id, transformOptions) {
      const include = options.compiler?.include ?? /\.[tj]sx$/;
      const exclude = options.compiler?.exclude;

      const file = normalizeId(id);
      if (!include.test(file)) return null;
      if (exclude?.test(file)) return null;
      if (file.includes('/node_modules/') || file.includes('\\node_modules\\')) return null;

      const hasJsx = /<[a-zA-Z]/.test(code);
      if (!options.compiler?.debugFlag && !code.includes('css') && !code.includes('define') && !hasJsx) {
        return null;
      }

      // SSR compilation requires BOTH conditions to be true:
      //   1. The project opts into server-side HTML rendering via `target: 'ssr'` or `target: 'ssg'`.
      //      Without this, a project with a server entry (e.g. SPA fullstack or API-only) would
      //      never want page modules compiled to SSR string output.
      //   2. Vite confirms this specific module load is happening in a server-side context.
      //      This is the signal that distinguishes the server pass from the client pass for the
      //      same file. Using OR here (the previous bug) caused client modules to be compiled
      //      as SSR too, producing `[object Object]` instead of DOM nodes during hydration.
      const wantsServerRendering = options.target === 'ssr' || options.target === 'ssg';
      const viteIsInSsrContext =
        transformOptions?.ssr === true ||
        // @ts-ignore: Vite 6 Environment API
        this.environment?.name === 'ssr' ||
        // @ts-ignore: Vite 6 Environment API fallback
        this.environment?.name === 'server';

      const ssr = wantsServerRendering && viteIsInSsrContext;
        
      let compiled = cssHandler.transform(code, file);
      compiled = compileAuwla(compiled, file, { ssr });

      if (compiled === code) {
        const marker = markerCode(false, options.compiler?.debugFlag);
        return marker ? { code: `${marker}${code}`, map: null } : null;
      }

      return {
        code: `${markerCode(true, options.compiler?.debugFlag)}${compiled}`,
        map: null,
        moduleType: 'js',
      };
    },
  };
}

export default auwla;
