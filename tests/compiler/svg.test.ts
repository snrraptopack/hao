import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('SVG compilation', () => {
  test('compiles SVG elements with createElementNS', () => {
    const source = `
      function App() {
        let r = 10;
        exports.update = () => { r = 20; };
        return () => (
          <svg width="100" height="100">
            <circle cx="50" cy="50" r={r} fill="red" />
          </svg>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // <svg> roots can use template cloning because innerHTML parses SVG children correctly
    expect(compiled).toContain('__cloneTemplate');
    expect(compiled).toContain('__componentBlock');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const circle = root.querySelector('circle')!;

    expect(circle.getAttribute('r')).toBe('10');
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg');

    evaluated.update();
    app.render();

    expect(circle.getAttribute('r')).toBe('20');
  });

  test('falls back to non-template path for standalone SVG roots', () => {
    const source = `
      function App() {
        let cx = 50;
        exports.update = () => { cx = 75; };
        return () => <circle cx={cx} cy="50" r="10" />;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('createElementNS("http://www.w3.org/2000/svg"');
    expect(compiled).not.toContain('__cloneTemplate("');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const circle = root.querySelector('circle')!;

    expect(circle.getAttribute('cx')).toBe('50');
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg');

    evaluated.update();
    app.render();

    expect(circle.getAttribute('cx')).toBe('75');
  });
});
