import type { Plugin, ViteDevServer, ModuleNode, HotUpdateOptions, EnvironmentModuleNode } from 'vite';
import { compileAuwla } from './compiler';
import { ViteCSSHandler, RESOLVED_ID } from './vite-css';
import { clearThemeCache } from './css/compiler/css-compiler';

export type AuwlaViteOptions = {
  include?: RegExp;
  exclude?: RegExp;
  debugFlag?: boolean | string;
  css?: boolean;
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

  return {
    name: 'auwla',
    enforce: 'pre',

    configureServer(server) {
      cssHandler.setServer(server);
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

    transform(code, id) {
      const file = normalizeId(id);
      if (!include.test(file)) return null;
      if (exclude?.test(file)) return null;
      if (file.includes('/node_modules/') || file.includes('\\node_modules\\')) return null;

      const hasJsx = /<[a-zA-Z]/.test(code);
      if (!options.debugFlag && !code.includes('css') && !code.includes('define') && !hasJsx) {
        return null;
      }

      let compiled = cssHandler.transform(code, file);
      compiled = compileAuwla(compiled, file);

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
