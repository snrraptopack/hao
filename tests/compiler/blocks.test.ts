import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('block-bodied render closures', () => {
  test('compiles block-bodied render closures', async () => {
    const source = `
      function App() {
        let count = 0;
        return () => {
          return <button onClick={() => { count++; }}>{count}</button>;
        };
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('__setElementText');
    expect(compiled).not.toContain('return () => {\n          return <button');

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));
    const button = root.querySelector('button')!;

    expect(button.textContent).toBe('0');
    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(button.textContent).toBe('1');
  });
});
