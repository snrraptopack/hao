/**
 * Fallback declaration for the generated server-manifest types module.
 *
 * The Vite plugin writes `.auwla/server-manifest.d.ts` and augments this
 * interface with the real remote keys. When the generated file is not yet
 * present (e.g. during the library build), this empty interface keeps the
 * `auwla/server-manifest` import valid.
 */
declare module 'auwla/server-manifest' {
  interface ServerManifestTypes {}
}
