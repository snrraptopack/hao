import ts from 'typescript';
import {
  __componentBlock,
  __cloneTemplate,
  __computed,
  __createBlock,
  __createBlockSimple,
  __dirtySource,
  __effect,
  __event,
  __escapeHtml,
  __hydrateComment,
  __hydrateElement,
  __isCheckboxChecked,
  __keyedMap,
  __setAttribute,
  __setChild,
  __setClass,
  __setElementText,
  __setProperty,
  __setSelectValue,
  __setStyle,
  __setText,
  __spreadProps,
  __ssrBlock,
  __ssrKeyedMap,
  __ssrNode,
  __ssrStyle,
  __trackSources,
  __updateCheckbox,
  __updateInput,
  __updateSelect,
  patchNode,
  toNode,
  commit,
  component,
  createMemoApp,
  emit,
  enterHydration,
  exitHydration,
  Fragment,
  h,
} from '../../src';
import { event } from '../../src/events';
import { compileAuwla } from '../../src/compiler';

export { compileAuwla };

export function evaluateCompiled(source: string) {
  const withoutImport = source
    .replace(/import \{([^}]+)\} from 'auwla';/g, (match, imports) => {
      const destructured = imports.replace(/\bas\b/g, ':');
      return `const {${destructured}} = runtime;`;
    })
    .replace(/import \{([^}]+)\} from 'auwla\/events';/g, (match, imports) => {
      const destructured = imports.replace(/\bas\b/g, ':');
      return `const {${destructured}} = runtime;`;
    });
  const js = ts.transpileModule(withoutImport, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'h',
      jsxFragmentFactory: 'Fragment',
    },
    fileName: 'test.tsx',
  }).outputText;
  const exports: Record<string, unknown> = {};

  // Inject h and Fragment so transpiled JSX works. Compiler-runtime imports are rewritten below.
  const jsWithGlobals = `const h = runtime.h; const Fragment = runtime.Fragment;\n${js}`;

  Function('runtime', 'exports', jsWithGlobals)({
    __componentBlock,
    __cloneTemplate,
    __computed,
    __createBlock,
    __createBlockSimple,
    __dirtySource,
    __effect,
    __event,
    __escapeHtml,
    __hydrateComment,
    __hydrateElement,
    __isCheckboxChecked,
    __keyedMap,
    __setAttribute,
    __setChild,
    __setClass,
    __setElementText,
    __setProperty,
    __setSelectValue,
    __setStyle,
    __setText,
    __spreadProps,
    __ssrBlock,
    __ssrKeyedMap,
    __ssrNode,
    __ssrStyle,
    __trackSources,
    __updateCheckbox,
    __updateInput,
    __updateSelect,
    patchNode,
    toNode,
    commit,
    component,
    createMemoApp,
    emit,
    enterHydration,
    event,
    exitHydration,
    h,
    Fragment,
  }, exports);

  return exports;
}

export { createMemoApp, h };
