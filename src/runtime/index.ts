/**
 * @fileoverview Runtime public API barrel.
 *
 * Re-exports the full runtime surface used by `auwla` and the JSX runtime.
 */

export type {
  ComponentHandle,
  MemoApp,
  MemoChild,
  MemoContext,
  MemoDeps,
  MemoProps,
  RenderClosure,
} from './types';

export {
  cleanup,
  component,
  createComponentClosure,
  createComponentId,
  emit,
  runInComponent,
  runInstanceCleanups,
  updateProps,
} from './component';

export {
  commit,
  createMemoApp,
} from './app';

export {
  createMemoElement,
  Fragment,
  h,
  setProp,
  setProps,
  toNode,
} from './dom';

export { memo } from './app';

export { __wrapCompilerEvent, currentComponentId, BLOCKED_EVENT, SILENT_EVENT } from './state';

export {
  createTemplateElement,
  objectShallowEqual,
  templateEqual,
} from './template';

export {
  patchChildren,
  patchNode,
  patchRoot,
} from './patch';

export { placePatchedNodes } from './reconcile';

export { reactive } from './reactive';
export type { ReactiveCell } from './reactive';
