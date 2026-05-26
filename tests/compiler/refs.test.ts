import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('ref callback compilation', () => {
  test('compiles ref callbacks in template-cloned root blocks', () => {
    const source = `
      function App() {
        let refEl = null;
        exports.getRef = () => refEl;
        return () => <div ref={(el) => { refEl = el; }}>Hello</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__cloneTemplate');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; getRef(): HTMLElement | null };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    expect(evaluated.getRef()).toBe(root.querySelector('div'));
  });
});
