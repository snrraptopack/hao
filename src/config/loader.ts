import type { ConfigEnv } from 'vite';
import type { AuwlaConfig } from '../config';

let cachedConfig: AuwlaConfig | null = null;

/**
 * Loads the Auwla configuration from `auwla.config.{ts,js,mjs}`.
 * The configuration is cached in memory to avoid duplicate reads and parses.
 */
export async function getAuwlaConfig(root: string, env: ConfigEnv): Promise<AuwlaConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const { loadConfigFromFile } = await import('vite');
  const fs = await import('node:fs');
  const path = await import('node:path');

  let loaded = null;
  const tsConfig = path.resolve(root, 'auwla.config.ts');
  const jsConfig = path.resolve(root, 'auwla.config.js');
  const mjsConfig = path.resolve(root, 'auwla.config.mjs');

  if (fs.existsSync(tsConfig)) {
    loaded = await loadConfigFromFile(env, tsConfig, root);
  } else if (fs.existsSync(jsConfig)) {
    loaded = await loadConfigFromFile(env, jsConfig, root);
  } else if (fs.existsSync(mjsConfig)) {
    loaded = await loadConfigFromFile(env, mjsConfig, root);
  }

  cachedConfig = loaded ? (loaded.config as AuwlaConfig) : {};
  return cachedConfig!;
}
