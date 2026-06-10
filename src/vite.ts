import type { Plugin, ViteDevServer, ModuleNode } from 'vite';
import { compileAuwla } from './compiler';
import { ViteCSSHandler } from './vite-css';
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

function invalidateModuleAndImporters(
  mod: ModuleNode,
  invalidated: Set<ModuleNode>,
  server: ViteDevServer
) {
  if (invalidated.has(mod)) return;
  invalidated.add(mod);

  server.moduleGraph.invalidateModule(mod);

  for (const importer of mod.importers) {
    invalidateModuleAndImporters(importer, invalidated, server);
  }
}

function markerCode(value: boolean, debugFlag: boolean | string | undefined): string {
  if (!debugFlag) return '';
  const name = typeof debugFlag === 'string' ? debugFlag : '__AUWLA_COMPILED__';
  return `globalThis.${name} = ${value};\n`;
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

    handleHotUpdate({ file, server, modules }) {
      const isTheme = file.includes('theme');
      const isStyleFile = file.endsWith('.ts') || file.endsWith('.tsx');

      if (isTheme || isStyleFile) {
        clearThemeCache();
      }

      if (file.endsWith('.ts') && server?.moduleGraph) {
        const mods = server.moduleGraph.getModulesByFile(file);
        if (mods) {
          const invalidated = new Set<ModuleNode>();
          for (const mod of mods) {
            invalidateModuleAndImporters(mod, invalidated, server);
          }
        }
      }

      const cssMod = server?.moduleGraph?.getModuleById('virtual:auwla.css');
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
