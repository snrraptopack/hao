/**
 * @file vite-css.ts
 * @description
 * Handles CSS extraction, aggregation, virtual module serving,
 * and Vite dev server HMR triggers for compiled styles.
 */

import type { ViteDevServer } from 'vite';
import { compileCSS } from './css/compiler/css-compiler';
import fs from 'fs';
import path from 'path';

const VIRTUAL_ID = 'virtual:auwla.css';
export const RESOLVED_ID = '\0' + VIRTUAL_ID;

export class ViteCSSHandler {
  private registry = new Map<string, Map<string, string>>();
  private server?: ViteDevServer;
  private enabled: boolean;
  private debug: boolean;
  private cssCache: string | null = null;
  private isDirty = true;

  constructor(enabled: boolean, debug: boolean = false) {
    this.enabled = enabled;
    this.debug = debug;
  }

  setServer(server: ViteDevServer) {
    this.server = server;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resolveId(id: string): string | null {
    if (this.enabled && (id === VIRTUAL_ID || id === RESOLVED_ID)) {
      return RESOLVED_ID;
    }
    return null;
  }

  getCssContent(): string {
    if (!this.isDirty && this.cssCache !== null) {
      return this.cssCache;
    }

    const allRules: string[] = [];
    for (const fileRules of this.registry.values()) {
      allRules.push(...fileRules.values());
    }

    const importRules = Array.from(new Set(allRules.filter((r) => r.trim().startsWith('@import'))));
    const remainingRules = allRules.filter((r) => !r.trim().startsWith('@import'));

    const baseRules = remainingRules.filter((r) =>
      !r.trim().startsWith('@media') &&
      (r.includes('html') || r.includes('body') || r.includes('* ') || r.includes('*:'))
    );

    const componentRules: string[] = [];
    const utilityRules: string[] = [];

    for (const r of remainingRules) {
      if (baseRules.includes(r)) continue;

      const isComponent = !r.trim().startsWith('@media') && (
        r.includes(' > ') ||
        r.includes(' + ') ||
        r.includes(' ~ ') ||
        r.includes('::before') ||
        r.includes('::after') ||
        r.includes('::placeholder')
      );

      if (isComponent) {
        componentRules.push(r);
      } else {
        utilityRules.push(r);
      }
    }

    const flatUtilities = utilityRules.filter((r) => !r.trim().startsWith('@media'));
    const mediaUtilities = utilityRules.filter((r) => r.trim().startsWith('@media'));

    const cssContent = [
      ...importRules,
      `@layer base, components, utilities;`,
      `@layer base {`,
      baseRules.join('\n'),
      `}`,
      `@layer components {`,
      componentRules.join('\n'),
      `}`,
      `@layer utilities {`,
      flatUtilities.join('\n'),
      mediaUtilities.join('\n'),
      `}`
    ].join('\n');

    if (this.debug) {
      try {
        const dir = path.resolve(process.cwd(), '.auwla');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, 'compiled.css'), cssContent, 'utf-8');
      } catch (err) {
        console.error('[auwla:css] Failed to write debug CSS file:', err);
      }
    }

    this.cssCache = cssContent;
    this.isDirty = false;
    return cssContent;
  }

  load(id: string): string | null {
    if (this.enabled && id === RESOLVED_ID) {
      return this.getCssContent();
    }
    return null;
  }

  transform(code: string, filepath: string): string {
    if (!this.enabled) {
      return code;
    }

    const fileRules = new Map<string, string>();

    const compiled = compileCSS(code, filepath, (className, declaration, mediaQuery) => {
      const ruleKey = className === '' ? declaration : (mediaQuery ? `${mediaQuery}::${className}` : className);
      const ruleVal = mediaQuery
        ? `@media (${mediaQuery}) {\n  ${declaration}\n}`
        : declaration;

      fileRules.set(ruleKey, ruleVal);
    });

    const oldRules = this.registry.get(filepath);
    let changed = false;

    if (!oldRules) {
      if (fileRules.size > 0) {
        changed = true;
      }
    } else if (oldRules.size !== fileRules.size) {
      changed = true;
    } else {
      for (const [k, v] of fileRules) {
        if (oldRules.get(k) !== v) {
          changed = true;
          break;
        }
      }
    }

    this.registry.set(filepath, fileRules);

    if (changed) {
      this.isDirty = true;
      if (this.server) {
        this.triggerHMR();
      }
    }

    return compiled;
  }

  deleteFile(filepath: string) {
    const file = filepath.split('?', 1)[0] ?? filepath;
    if (this.registry.delete(file)) {
      this.isDirty = true;
      if (this.server) {
        this.triggerHMR();
      }
    }
  }

  triggerHMR() {
    if (!this.server) return;
    const clientEnv = this.server.environments.client;
    const mod = clientEnv.moduleGraph.getModuleById(RESOLVED_ID);
    if (!mod) return;

    clientEnv.moduleGraph.invalidateModule(mod);

    const timestamp = Date.now();
    clientEnv.hot.send('custom', {
      type: 'css-update',
      path: mod.url,
      timestamp,
    });
  }
}
