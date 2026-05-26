import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('component inlining', () => {
  test('inlines simple components that just return JSX', () => {
    const source = `
      function Label(props) {
        return <span class="label">{props.text}</span>;
      }

      function App() {
        let label = 'Hello';
        exports.update = () => { label = 'World'; };
        return () => <div><Label text={label} /></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('<Label');
    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('__setText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('Hello');
    expect(span.className).toBe('label');

    evaluated.update();
    app.render();

    expect(span.textContent).toBe('World');
  });

  test('leaves components that reference children for runtime fallback', () => {
    const source = `
      function Card(props) {
        return <div class="card">{props.children}</div>;
      }

      function App() {
        return () => <Card><span>Hello</span></Card>;
      }
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('<Card>');
    expect(compiled).not.toContain('__componentBlock');
  });
});
