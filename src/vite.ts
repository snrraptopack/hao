import type { Plugin } from 'vite';
import { compileAuwla } from './compiler';
import { ViteCSSHandler, RESOLVED_ID } from './vite-css';
import { clearThemeCache } from './css/compiler/css-compiler';

export type AuwlaViteOptions = {
  include?: RegExp;
  exclude?: RegExp;
  debugFlag?: boolean | string;
  css?: boolean;
  /**
   * Force SSR compilation for every file transformed by this plugin.
   *
   * When `true`, components are compiled to `__ssrBlock` string templates
   * instead of `__createBlock` DOM calls — identical to what Vite sets
   * automatically for files loaded via `vite.ssrLoadModule` or a
   * `vite build --ssr` run.
   *
   * Set this in `vite.config.ts` to enable SSR rendering without needing
   * a separate server entry or a two-pass build:
   *
   * ```ts
   * // vite.config.ts
   * plugins: [auwla({ ssr: true })]
   * ```
   */
  ssr?: boolean;
  /**
   * Path to your custom server entry file (e.g. 'src/server.ts').
   * If provided, Vite will automatically intercept SSR/RPC requests
   * during development and route them through your custom server.
   */
  serverEntry?: string;
};

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
  const include = options.include ?? /\.[tj]sx$/;
  const exclude = options.exclude;

  const cssHandler = new ViteCSSHandler(!!options.css, !!options.debugFlag);
  let viteConfig: any;

  return {
    name: 'auwla',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
    },

    async closeBundle() {
      // Automatic two-pass build orchestration
      if (
        options.serverEntry &&
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
              ssr: options.serverEntry,
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
      console.log('[auwla:vite] configureServer running, serverEntry:', options.serverEntry)
      cssHandler.setServer(server);
      ;(globalThis as any).__auwla_vite_server = server;
      ;(globalThis as any).__auwla_vite_css_handler = cssHandler;
      const { createDevServerMiddleware } = await import('./dev-middleware.js')
      const middleware = await createDevServerMiddleware(server, options.serverEntry)
      server.middlewares.use(middleware)
      console.log('[auwla:vite] dev middleware registered!')
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
      const file = normalizeId(id);
      if (!include.test(file)) return null;
      if (exclude?.test(file)) return null;
      if (file.includes('/node_modules/') || file.includes('\\node_modules\\')) return null;

      const hasJsx = /<[a-zA-Z]/.test(code);
      if (!options.debugFlag && !code.includes('css') && !code.includes('define') && !hasJsx) {
        return null;
      }

      const ssr =
        options.ssr === true ||
        transformOptions?.ssr === true ||
        // @ts-ignore: Vite 6 Environment API
        this.environment?.name === 'ssr' ||
        // @ts-ignore: Vite 6 Environment API fallback
        this.environment?.name === 'server';
        
      let compiled = cssHandler.transform(code, file);
      compiled = compileAuwla(compiled, file, { ssr });

      if (compiled === code) {
        const marker = markerCode(false, options.debugFlag);
        return marker ? { code: `${marker}${code}`, map: null } : null;
      }

      return {
        code: `${markerCode(true, options.debugFlag)}${compiled}`,
        map: null,
        moduleType: 'js',
      };
    },
  };
}

export default auwla;
