/**
 * @fileoverview Compiler entry point.
 *
 * Re-exports the build-time TSX transform so that subpath imports
 * like `auwla/compiler` continue to resolve correctly.
 */

export { compileAuwla } from './compiler/index';
