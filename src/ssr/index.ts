/**
 * @fileoverview Public SSR API.
 */

export { renderToString, type RenderToStringOptions } from './render';
export { createSsrContext, type SsrContext, type SsrContextOptions } from './context';
export { type SsrRpcInvoker } from './invoker';
export { installDomShim } from './dom-shim';
export { serializeNode, serializeChildren } from './serialize';
export {
  createSsrAdapter,
  createSsrFetchAdapter,
  type SsrOptions,
  type SsrAdapterOptions,
  type SsrFetchAdapterOptions,
} from './adapter';
export { hydrate, type HydrateOptions } from './hydrate';
