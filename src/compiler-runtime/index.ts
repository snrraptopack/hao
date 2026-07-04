/**
 * @fileoverview Compiler-runtime public API barrel.
 *
 * Re-exports the imperative helpers that compiled code calls into.
 */

export type { CompiledBlock } from './block';

export { __createBlock, __componentBlock, __dirtySource, __trackSources } from './block';

export {
  __setElementText,
  __setText,
  __setChild,
  __setClass,
  __setProperty,
  __setAttribute,
  __setStyle,
  __spreadProps,
  __updateInput,
  __isCheckboxChecked,
  __updateCheckbox,
  __setSelectValue,
  __updateSelect,
} from './dom-setters';

export { __event } from './events';

export { computed as __computed, effect as __effect } from '../runtime/computed';

export { __cloneTemplate, enterHydration, exitHydration, __hydrateComment, __hydrateElement } from './template';

export { __keyedMap } from './keyed-map';

export { __ssrBlock, __ssrNode, __ssrKeyedMap, __ssrStyle, __escapeHtml } from './ssr';
