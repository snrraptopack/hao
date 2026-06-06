import type { Plugin } from 'vite';
import { compileAuwla } from './compiler';
import { ViteCSSHandler } from './vite-css';
import { clearThemeCache } from './css/compiler/css-compiler';

export type AuwlaViteOptions = {
  include?: RegExp;
  exclude?: RegExp;
  debugFlag?: boolean | string;
  css?: boolean; // If true, enables the CSS extraction and compilation pipeline
};

function normalizeId(id: string): string {
  return id.split('?', 1)[0] ?? id;
}

function markerCode(value: boolean, debugFlag: boolean | string | undefined): string {
  if (!debugFlag) return '';
  const name = typeof debugFlag === 'string' ? debugFlag : '__AUWLA_COMPILED__';
  return `globalThis.${name} = ${value};\n`;
}

export function auwla(options: AuwlaViteOptions = {}): Plugin {
  const include = options.include ?? /\.[tj]sx$/;
  const exclude = options.exclude;
  
  // Instantiate the modular CSS handler
  const cssHandler = new ViteCSSHandler(!!options.css, !!options.debugFlag);

  return {
    name: 'auwla',
    enforce: 'pre',

    configureServer(server) {
      cssHandler.setServer(server);
    },

    handleHotUpdate({ file }) {
      if (file.includes('theme')) {
        clearThemeCache();
      }
    },

    // 1. Delegate virtual module resolution
    resolveId(source) {
      return cssHandler.resolveId(source);
    },

    // 2. Delegate module loading
    load(id) {
      return cssHandler.load(id);
    },

    // 3. Transform TSX files: delegate CSS extraction first, then compile TSX templates
    transform(code, id) {
      const file = normalizeId(id);
      if (!include.test(file)) return null;
      if (exclude?.test(file)) return null;
      if (file.includes('/node_modules/') || file.includes('\\node_modules\\')) return null;

      // 1. Perform CSS extraction on the raw JSX code via the handler
      let compiled = cssHandler.transform(code, file);

      // 2. Perform the JSX template lowering transform on the result
      compiled = compileAuwla(compiled, file);

      if (compiled === code) {
        const marker = markerCode(false, options.debugFlag);
        return marker ? { code: `${marker}${code}`, map: null } : null;
      }

      return {
        code: `${markerCode(true, options.debugFlag)}${compiled}`,
        map: null,
      };
    },
  };
}

export default auwla;
