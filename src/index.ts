export {
  Fragment,
  cleanup,
  commit,
  component,
  createMemoApp,
  createMemoElement,
  emit,
  h,
  memo,
} from './runtime/index';

export {
  __componentBlock,
  __cloneTemplate,
  __createBlock,
  __event,
  __keyedMap,
  __setAttribute,
  __setChild,
  __setClass,
  __setElementText,
  __setProperty,
  __setStyle,
  __setText,
  __spreadProps,
} from './compiler-runtime/index';

export type {
  ComponentHandle,
  MemoApp,
  MemoChild,
  MemoContext,
  MemoDeps,
  MemoProps,
  RenderClosure,
} from './runtime/index';

export type { CompiledBlock } from './compiler-runtime/index';
