import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('fragment compilation', () => {
  test('compiles fragments as transparent child containers', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => (
          <div>
            <>{show ? 'Yes' : 'No'}</>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('No');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('Yes');
  });
});

describe('conditional child expressions', () => {
  test('compiles ternary expressions in children', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? 'Yes' : 'No'}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setElementText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('No');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('Yes');
  });

  test('compiles logical AND expressions in children', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show && 'Visible'}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setElementText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('Visible');
  });
});
