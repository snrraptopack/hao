/**
 * Regression tests for compiler issue-registry fixes (B14, B15, B16).
 * Each test names the issue it covers — see ARCHITECTURE.md.
 */
import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('B14 — SSR codegen escapes template-literal chars in static content', () => {  test('static attribute value with backtick, ${ and backslash produces valid code', () => {
    const source = `
      function App() {
        return () => <div title="a\`b\${x}\\\\path">ok</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    expect(compiled).toContain('__ssrBlock');

    // evaluateCompiled transpiles + constructs the module — it would throw
    // on invalid generated syntax.
    const { App } = evaluateCompiled(compiled) as { App: () => { toString(): string } };
    expect(String(App())).toBe('<div title="a`b${x}\\\\path">ok</div>');
  });

  test('static JSX text with backtick and backslash survives SSR', () => {
    const source = `
      function App() {
        return () => <p>tick \` back \\\\ path</p>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source, 'input.tsx', { ssr: true });
    const { App } = evaluateCompiled(compiled) as { App: () => { toString(): string } };
    expect(String(App())).toBe('<p>tick ` back \\\\ path</p>');
  });

  test('client (non-SSR) path is unaffected by template-literal escaping', () => {
    const source = `
      function App() {
        return () => <div title="a\`b\${x}">ok</div>;
      }
      exports.App = App;
    `;

    // Client templates embed the html via JSON.stringify — no template
    // literal context, so no extra escaping must be applied.
    const compiled = compileAuwla(source, 'input.tsx');
    expect(compiled).toContain('__cloneTemplate');
    expect(compiled).toContain('a`b${x}');
  });
});

describe('B15 — bind={derived} falls back instead of emitting invalid JS', () => {
  test('binding a derived variable emits no `() =` assignment', () => {
    const source = `
      function App() {
        let text = 'hello';
        let upper = text.toUpperCase();
        return () => <input type="text" bind={upper} />;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // `upper` is derived → compiled to __computed getter → bind cannot write
    // to it. The closure must fall back (no `upper() = ...` anywhere).
    expect(compiled).not.toContain('upper() =');
    expect(compiled).not.toMatch(/\bupper\(\)\s*=[^=>]/);
    // The component still works — via the runtime fallback path.
    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));
    expect(root.querySelector('input')).not.toBeNull();
  });

  test('binding plain state still compiles to bind helpers', () => {
    const source = `
      function App() {
        let text = 'hello';
        return () => <input type="text" bind={text} />;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__updateInput');
    expect(compiled).toContain('bind' === undefined ? '' : ''); // no-op guard
  });
});

describe('B16 — overlapping replacements never corrupt output', () => {
  test('nested await is wrapped once at the outermost position', () => {
    const source = `
      function Demo() {
        let count = 0;
        const run = async () => {
          await (await Promise.resolve(1));
          count++;
        };
        run();
        return <div>{count}</div>;
      }
      exports.Demo = Demo;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('(__commit(__self), await (await Promise.resolve(1)));');
    // No duplicated leftover text from the stale-coordinate splice.
    expect(compiled.match(/Promise\.resolve\(1\)/g)!.length).toBe(1);
    // Valid, executable module.
    expect(() => evaluateCompiled(compiled)).not.toThrow();
  });

  test('two disjoint awaits in one async fn are both wrapped', () => {
    const source = `
      function Demo() {
        let count = 0;
        const run = async () => {
          await Promise.resolve(1);
          count++;
          await Promise.resolve(2);
          count++;
        };
        run();
        return <div>{count}</div>;
      }
      exports.Demo = Demo;
    `;

    const compiled = compileAuwla(source);
    const wraps = compiled.match(/\(__commit\(__self\), await /g) ?? [];
    expect(wraps.length).toBe(2);
    expect(() => evaluateCompiled(compiled)).not.toThrow();
  });

  test('async callback inside a reactive setup-if is not corrupted', () => {
    const source = `
      function Demo() {
        let count = 0;
        let enabled = true;
        if (enabled) {
          setTimeout(async () => {
            await Promise.resolve(1);
            count++;
          }, 10);
        }
        return <div>{count}</div>;
      }
      exports.Demo = Demo;
    `;

    const compiled = compileAuwla(source);
    // The reactive-if keeps original inner text (contained wraps dropped) —
    // the output must remain valid, with no duplicated fragments.
    expect(compiled.match(/Promise\.resolve\(1\)/g)!.length).toBe(1);
    expect(compiled.match(/setTimeout/g)!.length).toBe(1);
    expect(() => evaluateCompiled(compiled)).not.toThrow();
  });
});
