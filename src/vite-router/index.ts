/**
 * @fileoverview Public entry point for the auwla/vite-router package.
 *
 * Usage:
 *   import { auwlaRouter } from 'auwla/vite-router'
 *
 * Only the plugin factory and its options type are exported. Internal
 * helpers (scanner, codegen) are intentionally not re-exported — they are
 * implementation details. Tests import them directly from their source files.
 */

export { auwlaRouter } from './plugin'
export type { AuwlaRouterOptions } from './types'
