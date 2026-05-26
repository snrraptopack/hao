import ts from 'typescript';
import {
  __componentBlock,
  __cloneTemplate,
  __createBlock,
  __event,
  __keyedMap,
  __setAttribute,
  __setChild,
  __setClass,
  __setProperty,
  __setStyle,
  __setText,
  __spreadProps,
  createMemoApp,
  h,
} from '../../src';
import { compileAuwla } from '../../src/compiler';

export { compileAuwla };

export function evaluateCompiled(source: string) {
  const withoutImport = source.replace(
    /import \{([^}]+)\} from 'auwla';/,
    'const {$1} = runtime;',
  );
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

  Function('runtime', 'exports', js)({
    __componentBlock,
    __cloneTemplate,
    __createBlock,
    __event,
    __keyedMap,
    __setAttribute,
    __setChild,
    __setClass,
    __setProperty,
    __setStyle,
    __setText,
    __spreadProps,
    createMemoApp,
  }, exports);

  return exports;
}

export { createMemoApp, h };
