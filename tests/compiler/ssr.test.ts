import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled } from './_helpers';

describe('SSR compiler target', () => {
  test('renders a simple static component to an HTML string', () => {
    const source = `
      function App() {
        return () => <section class="page"><h1>Hello</h1></section>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    expect(compiled).toContain('__ssrBlock');
    const bodyAfterImport = compiled.slice(compiled.indexOf('\n', compiled.indexOf('from \'auwla\'')));
    expect(bodyAfterImport).not.toContain('__componentBlock');
    expect(bodyAfterImport).not.toContain('__cloneTemplate');

    const { App } = evaluateCompiled(compiled) as { App: () => string };
    expect(App()).toBe('<section class="page"><h1>Hello</h1></section>');
  });

  test('renders dynamic text escaped', () => {
    const source = `
      function App() {
        let title = '<script>alert(1)</script>';
        return () => <h1>{title}</h1>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    expect(compiled).toContain('__escapeHtml(title)');

    const { App } = evaluateCompiled(compiled) as { App: () => string };
    expect(App()).toBe('<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>');
  });

  test('renders dynamic attributes correctly', () => {
    const source = `
      function App() {
        let href = '/about?x=1&y=2';
        let active = true;
        return () => <a href={href} class={active ? 'active' : ''}>Link</a>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    expect(compiled).toContain('__escapeHtml(href)');

    const { App } = evaluateCompiled(compiled) as { App: () => string };
    expect(App()).toBe('<a href="/about?x=1&amp;y=2" class="active">Link</a>');
  });

  test('omits event listeners in SSR output', () => {
    const source = `
      function App() {
        let count = 0;
        return () => <button onClick={() => { count++; }}>{count}</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    expect(compiled).toContain('__ssrBlock');
    expect(compiled).not.toContain('addEventListener');

    const { App } = evaluateCompiled(compiled) as { App: () => string };
    expect(App()).toBe('<button>0</button>');
  });

  test('renders single dynamic child as element text', () => {
    const source = `
      function App() {
        let label = 'Hello';
        return () => <span>{label}</span>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    expect(compiled).toContain('__escapeHtml(label)');

    const { App } = evaluateCompiled(compiled) as { App: () => string };
    expect(App()).toBe('<span>Hello</span>');
  });
});
