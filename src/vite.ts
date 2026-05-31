import type { Plugin } from 'vite';
import { compileAuwla } from './compiler';

export type AuwlaViteOptions = {
  include?: RegExp;
  exclude?: RegExp;
  debugFlag?: boolean | string;
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

  return {
    name: 'auwla',
    enforce: 'pre',
    transform(code, id) {
      const file = normalizeId(id);
      if (!include.test(file)) return null;
      if (exclude?.test(file)) return null;
      if (file.includes('/node_modules/') || file.includes('\\node_modules\\')) return null;

      const compiled = compileAuwla(code, file);
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
