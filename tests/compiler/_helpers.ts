import ts from 'typescript';
import {
  __componentBlock,
  __cloneTemplate,
  __createBlock,
  __dirtySource,
  __event,
  __escapeHtml,
  __keyedMap,
  __setAttribute,
  __setChild,
  __setClass,
  __setElementText,
  __setProperty,
  __setStyle,
  __setText,
  __spreadProps,
  __ssrBlock,
  __ssrKeyedMap,
  __ssrNode,
  __trackSources,
  commit,
  component,
  createMemoApp,
  emit,
  Fragment,
  h,
} from '../../src';
import { event } from '../../src/events';
import { compileAuwla } from '../../src/compiler';

export { compileAuwla };

export function evaluateCompiled(source: string) {
  const withoutImport = source
    .replace(/import \{([^}]+)\} from 'auwla';/, 'const {$1} = runtime;')
    .replace(/import \{([^}]+)\} from 'auwla\/events';/, 'const {$1} = runtime;');
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

  // Inject h, Fragment, component, commit into scope so transpiled JSX and runtime calls work
  const jsWithGlobals = `const h = runtime.h; const Fragment = runtime.Fragment; const component = runtime.component; const commit = runtime.commit; const emit = runtime.emit;\n${js}`;

  Function('runtime', 'exports', jsWithGlobals)({
    __componentBlock,
    __cloneTemplate,
    __createBlock,
    __dirtySource,
    __event,
    __escapeHtml,
    __keyedMap,
    __setAttribute,
    __setChild,
    __setClass,
    __setElementText,
    __setProperty,
    __setStyle,
    __setText,
    __spreadProps,
    __ssrBlock,
    __ssrKeyedMap,
    __ssrNode,
    __trackSources,
    commit,
    component,
    createMemoApp,
    emit,
    event,
    h,
    Fragment,
  }, exports);

  return exports;
}

export { createMemoApp, h };
