import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('attribute compilation', () => {
  test('patches dynamic child expressions instead of stringifying them', () => {
    const source = `
      function App() {
        let show = false;
        const popup = document.createElement('span');
        popup.textContent = 'Popup';
        exports.toggle = () => { show = !show; };
        return () => <section>{show && popup}</section>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setChild');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('Popup');
    expect(root.textContent).not.toContain('[object');
  });

  test('compiles style objects and decoded JSX text correctly', () => {
    const source = `
      function App() {
        let color = 'red';
        exports.blue = () => { color = 'blue'; };
        return () => <div style={{ color, paddingLeft: 8 }}>Hello &amp; welcome</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setStyle');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; blue(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const div = root.querySelector('div')!;

    expect(div.textContent).toBe('Hello & welcome');
    expect(div.style.color).toBe('red');
    expect(div.style.paddingLeft).toBe('8px');

    evaluated.blue();
    app.render();

    expect(div.style.color).toBe('blue');
  });

  test('compiles static boolean attributes into setup', () => {
    const source = `
      function App() {
        let label = 'Ready';
        return () => <button disabled>{label}</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // With template cloning, boolean attributes are baked into the HTML string
    expect(compiled).toContain('__cloneTemplate("<button disabled></button>"');

    const updateBody = compiled.slice(compiled.indexOf('update()'));
    expect(updateBody).not.toContain('__setAttribute(el0, "disabled", true);');
  });

  test('compiles ternary expressions in attributes', () => {
    const source = `
      function App() {
        let active = false;
        exports.toggle = () => { active = !active; };
        return () => <div class={active ? 'on' : 'off'}>Status</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setClass');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const div = root.querySelector('div')!;

    expect(div.className).toBe('off');

    evaluated.toggle();
    app.render();

    expect(div.className).toBe('on');
  });

  test('compiles spread attributes', () => {
    const source = `
      function App() {
        let attrs = { class: 'a', id: 'x' };
        exports.update = () => { attrs = { class: 'b', id: 'y' }; };
        return () => <div {...attrs}>Hello</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__spreadProps');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const div = root.querySelector('div')!;

    expect(div.className).toBe('a');
    expect(div.id).toBe('x');

    evaluated.update();
    app.render();

    expect(div.className).toBe('b');
    expect(div.id).toBe('y');
  });

  test('normalizes htmlFor to for attribute', () => {
    const source = `
      function App() {
        let target = 'input1';
        exports.update = () => { target = 'input2'; };
        return () => <label htmlFor={target}>Name</label>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('"for"');
    expect(compiled).not.toContain('"htmlFor"');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const label = root.querySelector('label')!;

    expect(label.getAttribute('for')).toBe('input1');

    evaluated.update();
    app.render();

    expect(label.getAttribute('for')).toBe('input2');
  });

  test('compiles data and aria attributes', () => {
    const source = `
      function App() {
        let id = '123';
        return () => <div data-test-id={id} aria-label="Hello">Content</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('data-test-id');
    expect(compiled).toContain('aria-label');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));
    const div = root.querySelector('div')!;

    expect(div.getAttribute('data-test-id')).toBe('123');
    expect(div.getAttribute('aria-label')).toBe('Hello');
  });

  test('normalizes React camelCase attributes to HTML equivalents', () => {
    const cases = [
      { jsx: 'srcSet="a.jpg"', normalized: 'srcset', original: 'srcSet' },
      { jsx: 'spellCheck={true}', normalized: 'spellcheck', original: 'spellCheck' },
      { jsx: 'useMap="#map"', normalized: 'usemap', original: 'useMap' },
      { jsx: 'frameBorder="0"', normalized: 'frameborder', original: 'frameBorder' },
      { jsx: 'cellPadding="4"', normalized: 'cellpadding', original: 'cellPadding' },
      { jsx: 'cellSpacing="2"', normalized: 'cellspacing', original: 'cellSpacing' },
      { jsx: 'colSpan={2}', normalized: 'colspan', original: 'colSpan' },
      { jsx: 'rowSpan={3}', normalized: 'rowspan', original: 'rowSpan' },
      { jsx: 'charSet="utf-8"', normalized: 'charset', original: 'charSet' },
      { jsx: 'referrerPolicy="no-referrer"', normalized: 'referrerpolicy', original: 'referrerPolicy' },
    ];

    for (const { jsx, normalized, original } of cases) {
      const source = `
        function App() {
          return () => <div ${jsx}>X</div>;
        }
      `;
      const compiled = compileAuwla(source);
      expect(compiled, `for ${jsx}`).toContain(normalized);
      expect(compiled, `for ${jsx}`).not.toContain(original);
    }
  });

  test('converts static style objects to CSS strings in templates', () => {
    const source = `
      function App() {
        return () => (
          <div style={{ padding: '16px', borderRadius: 8, opacity: 0.5 }}>Hello</div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__cloneTemplate');
    expect(compiled).toContain('padding: 16px');
    expect(compiled).toContain('border-radius: 8px');
    expect(compiled).toContain('opacity: 0.5');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));
    const div = root.querySelector('div')!;

    expect(div.style.padding).toBe('16px');
    expect(div.style.borderRadius).toBe('8px');
    expect(div.style.opacity).toBe('0.5');
  });

  test('bails from template path for dynamic style objects', () => {
    const source = `
      function App() {
        let color = 'red';
        return () => <div style={{ color, padding: 8 }}>Hello</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Dynamic style causes template bail; uses non-template path with __setStyle
    expect(compiled).toContain('__setStyle');
  });
});
