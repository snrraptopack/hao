/**
 * @fileoverview Auwla global configuration.
 */

export type AuwlaRenderMode = 'ssr' | 'ssg' | 'spa';

export interface AuwlaConfig {
  /** 
   * The default rendering mode for all pages. 
   * Individual pages can override this by exporting `export const config = { renderMode: '...' }`.
   * Defaults to 'spa'.
   */
  target?: AuwlaRenderMode;

  directories?: {
    /** The directory where your page components live. Defaults to 'src/pages'. */
    pages?: string;
    /** The directory where your backend server functions live. Defaults to 'src/server'. */
    server?: string;
    /** The directory where internal build manifests are stored. Defaults to '.auwla'. */
    manifest?: string;
  };

  server?: {
    /** Path to your custom server entry file (e.g. 'src/server.ts'). */
    entry?: string;
  };

  router?: {
    /** Enable code splitting via dynamic imports. Defaults to false. */
    lazy?: boolean;
    /** Output path for the generated TypeScript type augmentation file. Defaults to 'src/auwla.gen.ts'. */
    genFile?: string;
    /** File extensions treated as page files. Defaults to ['.tsx', '.ts', '.jsx', '.js']. */
    extensions?: string[];
  };

  compiler?: {
    include?: RegExp;
    exclude?: RegExp;
    css?: boolean;
    debugFlag?: boolean | string;
  };
}

/**
 * Define the global Auwla configuration.
 * 
 * Usage in `auwla.config.ts`:
 * ```ts
 * import { defineConfig } from 'auwla/config';
 * 
 * export default defineConfig({
 *   target: 'ssg',
 *   directories: {
 *     pages: 'src/pages',
 *     server: 'src/server'
 *   }
 * });
 * ```
 */
export function defineConfig(config: AuwlaConfig): AuwlaConfig {
  return config;
}

export const DEFAULT_CONFIG: AuwlaConfig = {
  target: 'spa',
  directories: {
    pages: 'src/pages',
    server: 'src/server',
    manifest: '.auwla'
  }
};
