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

export class ViteCSSHandler {
  // Nested map registry: filepath -> ruleKey -> ruleVal
  private registry = new Map<string, Map<string, string>>();
  private server?: ViteDevServer;
  private enabled: boolean;
  private debug: boolean;

  constructor(enabled: boolean, debug: boolean = false) {
    this.enabled = enabled;
    this.debug = debug;
  }

  /**
   * Registers the active Vite development server instance.
   */
  setServer(server: ViteDevServer) {
    this.server = server;
  }

  /**
   * Resolves the virtual CSS module path.
   */
  resolveId(id: string): string | null {
    if (this.enabled && id === 'virtual:auwla.css') {
      return '\0virtual:auwla.css'; // Rollup virtual prefix
    }
    return null;
  }

  /**
   * Loads the aggregated stylesheet content for the virtual module.
   * Resolves Finding 1 by placing base styles before media queries.
   */
  load(id: string): string | null {
    if (this.enabled && id === '\0virtual:auwla.css') {
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

      return cssContent;
    }
    return null;
  }

  /**
   * Runs the CSS compiler on the transformed code to extract style classes.
   * Resolves Finding 2 by garbage collecting deleted rules per file on HMR.
   */
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

    if (changed && this.server) {
      this.triggerHMR();
    }

    return compiled;
  }

  /**
   * Cleans up registry mappings and triggers HMR when a style-declaring file is deleted.
   */
  deleteFile(filepath: string) {
    const file = filepath.split('?', 1)[0] ?? filepath;
    if (this.registry.delete(file)) {
      if (this.server) {
        this.triggerHMR();
      }
    }
  }

  /**
   * Invalidate the virtual CSS module and push an HMR update to the browser client.
   */
  triggerHMR() {
    const mod = this.server?.moduleGraph.getModuleById('\0virtual:auwla.css');
    if (mod) {
      this.server?.moduleGraph.invalidateModule(mod);
      this.server?.ws.send({
        type: 'update',
        updates: [
          {
            type: 'js-update',
            path: mod.url,
            acceptedPath: mod.url,
            timestamp: Date.now(),
          },
        ],
      });
    }
  }
}
