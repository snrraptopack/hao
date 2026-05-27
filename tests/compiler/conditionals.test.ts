import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('conditional JSX compilation', () => {
  test('compiles ternary with JSX branches into direct DOM blocks', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? <span class="yes">Yes</span> : <span class="no">No</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Should NOT use __setChild for the whole expression anymore
    const bodyAfterImport = compiled.replace(/^import \{[^}]+\} from 'auwla';\s*/m, '');
    // But __setChild IS used inside the conditional for branch swapping
    expect(bodyAfterImport).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')!.className).toBe('no');
    expect(root.querySelector('span')!.textContent).toBe('No');

    evaluated.toggle();
    app.render();

    expect(root.querySelector('span')!.className).toBe('yes');
    expect(root.querySelector('span')!.textContent).toBe('Yes');

    evaluated.toggle();
    app.render();

    expect(root.querySelector('span')!.className).toBe('no');
    expect(root.querySelector('span')!.textContent).toBe('No');
  });

  test('compiles logical AND with JSX into direct DOM blocks', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show && <span>Visible</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const bodyAfterImport = compiled.replace(/^import \{[^}]+\} from 'auwla';\s*/m, '');
    expect(bodyAfterImport).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')).toBeNull();

    evaluated.toggle();
    app.render();

    expect(root.querySelector('span')!.textContent).toBe('Visible');

    evaluated.toggle();
    app.render();

    expect(root.querySelector('span')).toBeNull();
  });

  test('compiles ternary with one JSX branch and null branch', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? <span>Hello</span> : null}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const bodyAfterImport = compiled.replace(/^import \{[^}]+\} from 'auwla';\s*/m, '');
    expect(bodyAfterImport).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')).toBeNull();

    evaluated.toggle();
    app.render();

    expect(root.querySelector('span')!.textContent).toBe('Hello');

    evaluated.toggle();
    app.render();

    expect(root.querySelector('span')).toBeNull();
  });

  test('updates dynamic text inside conditional JSX branches', () => {
    const source = `
      function App() {
        let show = false;
        let text = 'A';
        exports.toggle = () => { show = !show; };
        exports.setText = (t: string) => { text = t; };
        return () => <div>{show ? <span>{text}</span> : <span>Hidden</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
      setText(t: string): void;
    };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')!.textContent).toBe('Hidden');

    evaluated.toggle();
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('A');

    evaluated.setText('B');
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('B');

    evaluated.toggle();
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('Hidden');
  });

  test('avoids DOM swap when conditional value does not change', () => {
    const source = `
      function App() {
        let show = true;
        let text = 'Hello';
        exports.setText = (t: string) => { text = t; };
        return () => <div>{show ? <span>{text}</span> : <span>Bye</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      setText(t: string): void;
    };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('Hello');

    evaluated.setText('World');
    app.render();

    // Same span instance should still be in the DOM (no swap)
    expect(root.querySelector('span')).toBe(span);
    expect(span.textContent).toBe('World');
  });

  test('emits conditional branch patches only inside the active branch', () => {
    const source = `
      function App() {
        let show = true;
        let text = '';
        return () => <div>{show ? <input value={text} /> : null}</div>;
      }
    `;

    const compiled = compileAuwla(source);
    const propertyPatches = compiled.match(/__setProperty\(el\d+, "value", text\);/g) ?? [];
    expect(propertyPatches).toHaveLength(1);
  });

  test('fallback dynamic child path preserves focused input when branch stays active', async () => {
    const source = `
      function App() {
        let show = true;
        let text = '';
        return () => (
          <div>
            {show ? (
              <input
                value={text}
                onInput={(event) => {
                  text = (event.target as HTMLInputElement).value;
                }}
              />
            ) : 'Hidden'}
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const bodyAfterImport = compiled.replace(/^import \{[^}]+\} from 'auwla';\s*/m, '');
    expect(bodyAfterImport).toContain('__setChild');
    expect(bodyAfterImport).not.toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    document.body.append(root);
    createMemoApp(root, h(evaluated.App as any));

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    input.value = 'hello';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await tick();

    expect(root.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('hello');
    root.remove();
  });

  test('falls back to __setChild for mixed JSX and non-nullish branches', () => {
    const source = `
      function App() {
        let show = false;
        return () => <div>{show ? <span>Yes</span> : 'No'}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const bodyAfterImport = compiled.replace(/^import \{[^}]+\} from 'auwla';\s*/m, '');
    // Should NOT contain activeBranch because it falls back
    expect(bodyAfterImport).not.toContain('activeBranch');
    expect(bodyAfterImport).toContain('__setChild');
  });
});
