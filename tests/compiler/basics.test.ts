import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('basic render closure compilation', () => {
  test('lowers a simple render closure into a direct DOM block', async () => {
    const source = `
      function Counter() {
        let count = 0;
        return () => <button class={count % 2 ? 'odd' : 'even'} onClick={() => { count++; }}>Count: {count}</button>;
      }
      exports.Counter = Counter;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('__setClass');
    expect(compiled).toContain('__setText');
    expect(compiled).not.toContain('return () => <button');

    const { Counter } = evaluateCompiled(compiled) as { Counter: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(Counter as any));
    const button = root.querySelector('button')!;

    expect(button.textContent).toBe('Count: 0');
    expect(button.className).toBe('even');

    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Count: 1');
    expect(button.className).toBe('odd');
  });

  test('leaves unsupported JSX untouched for runtime fallback', () => {
    const source = `
      function App(props) {
        return () => <props.tag>Hello</props.tag>;
      }
    `;

    expect(compileAuwla(source)).toBe(source);
  });

  test('leaves component JSX untouched for runtime fallback', () => {
    const source = `
      function Label(props) {
        return () => <span>{props.text}</span>;
      }

      function App() {
        return () => <Label text="Hello" />;
      }
    `;

    const compiled = compileAuwla(source);

    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('return () => <Label text="Hello" />');
    expect(compiled).not.toContain('document.createElement("Label")');
  });
});
