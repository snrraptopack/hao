import { describe, expect, test, vi } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('fine-grained DOM patching', () => {
  test('event handler mutating one variable marks only that variable dirty', () => {
    const source = `
      function App() {
        let count = 0;
        let name = 'hello';
        return () => (
          <div>
            <span id="c">{count}</span>
            <span id="n">{name}</span>
            <button onClick={() => count++}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Handler should track count mutation
    expect(compiled).toContain('__dirty.add("count")');
    // Should NOT mark name as dirty
    expect(compiled).not.toMatch(/__dirty\.add\("name"\)/);
    // update() should have conditional blocks
    expect(compiled).toContain('const _count = _all || __dirty.delete(\'count\')');
    expect(compiled).toContain('const _name = _all || __dirty.delete(\'name\')');
  });

  test('clicking button updates only dependent DOM nodes', async () => {
    const source = `
      function App() {
        let count = 0;
        let name = 'hello';
        return () => (
          <div>
            <span id="c">{count}</span>
            <span id="n">{name}</span>
            <button onClick={() => count++}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const countSpan = root.querySelector('#c')!;
    const nameSpan = root.querySelector('#n')!;
    const button = root.querySelector('button')!;

    expect(countSpan.textContent).toBe('0');
    expect(nameSpan.textContent).toBe('hello');

    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(countSpan.textContent).toBe('1');
    expect(nameSpan.textContent).toBe('hello');
  });

  test('multiple independent variables each have their own patch group', () => {
    const source = `
      function App() {
        let a = 0;
        let b = 0;
        return () => (
          <div>
            <span>{a}</span>
            <span>{b}</span>
            <button id="ba" onClick={() => a++}>a</button>
            <button id="bb" onClick={() => b++}>b</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__dirty.add("a")');
    expect(compiled).toContain('__dirty.add("b")');
    expect(compiled).toContain('const _a = _all || __dirty.delete(\'a\')');
    expect(compiled).toContain('const _b = _all || __dirty.delete(\'b\')');
  });

  test('mutating one variable does not patch unrelated spans', async () => {
    const source = `
      function App() {
        let a = 0;
        let b = 0;
        return () => (
          <div>
            <span id="sa">{a}</span>
            <span id="sb">{b}</span>
            <button id="ba" onClick={() => a++}>a</button>
            <button id="bb" onClick={() => b++}>b</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const spanA = root.querySelector('#sa')!;
    const spanB = root.querySelector('#sb')!;

    root.querySelector('#ba')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(spanA.textContent).toBe('1');
    expect(spanB.textContent).toBe('0');

    root.querySelector('#bb')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(spanA.textContent).toBe('1');
    expect(spanB.textContent).toBe('1');
  });

  test('derived values are patched when their source variable changes', () => {
    const source = `
      function App() {
        let count = 0;
        let doubled = count * 2;
        return () => (
          <div>
            <span id="c">{count}</span>
            <span id="d">{doubled}</span>
            <button onClick={() => count++}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Derived expression should be inlined
    expect(compiled).toContain('(count * 2)');
    // Both count and derived patches should be in the _count group
    expect(compiled).toMatch(/if \(_count\) \{[\s\S]*?__setElementText\(el1, count\)[\s\S]*?__setElementText\(el2, \(count \* 2\)\)/);
  });

  test('derived value DOM updates when source variable changes', async () => {
    const source = `
      function App() {
        let count = 0;
        let doubled = count * 2;
        return () => (
          <div>
            <span id="c">{count}</span>
            <span id="d">{doubled}</span>
            <button onClick={() => count++}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const countSpan = root.querySelector('#c')!;
    const doubledSpan = root.querySelector('#d')!;
    const button = root.querySelector('button')!;

    expect(countSpan.textContent).toBe('0');
    expect(doubledSpan.textContent).toBe('0');

    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(countSpan.textContent).toBe('1');
    expect(doubledSpan.textContent).toBe('2');
  });

  test('handler with return falls back to full update (__all)', () => {
    const source = `
      function App() {
        let count = 0;
        let name = 'hello';
        return () => (
          <div>
            <span>{count}</span>
            <span>{name}</span>
            <button onClick={() => { count++; return; }}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Should fall back to __all due to return statement
    expect(compiled).toContain('__dirty.add("__all")');
  });

  test('handler with try/catch falls back to full update (__all)', () => {
    const source = `
      function App() {
        let count = 0;
        return () => (
          <button onClick={() => { try { count++; } catch(e) {} }}>+</button>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__dirty.add("__all")');
  });

  test('no mutations detected produces plain handler without dirty tracking', () => {
    const source = `
      function App() {
        let count = 0;
        return () => <button onClick={() => console.log(count)}>log</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Plain handler — no dirty wrapper
    expect(compiled).toContain('let eventHandler0 = () => console.log(count);');
    expect(compiled).not.toContain('__dirty.add');
  });

  test('multiple mutations in one handler dirty multiple variables', () => {
    const source = `
      function App() {
        let count = 0;
        let name = 'hello';
        return () => (
          <div>
            <span id="c">{count}</span>
            <span id="n">{name}</span>
            <button onClick={() => { count++; name = 'world'; }}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__dirty.add("count")');
    expect(compiled).toContain('__dirty.add("name")');
  });

  test('full update runs when parent invalidates (no prior dirty)', async () => {
    const source = `
      function App() {
        let count = 0;
        exports.bump = () => { count++; };
        return () => <span>{count}</span>;
      }
      exports.App = App;
    `;

    const evaluated = evaluateCompiled(compileAuwla(source)) as { App: () => unknown; bump(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('0');

    evaluated.bump();
    app.render();

    expect(root.textContent).toBe('1');
  });

  test('class patches are grouped by their dependent variable', () => {
    const source = `
      function App() {
        let active = false;
        return () => <div class={active ? 'on' : 'off'}><button onClick={() => active = !active}>toggle</button></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__dirty.add("active")');
    expect(compiled).toContain('const _active = _all || __dirty.delete(\'active\')');
    expect(compiled).toContain('__setClass');
  });

  test('increment and decrement operators are tracked as mutations', () => {
    const source = `
      function App() {
        let count = 0;
        return () => (
          <div>
            <span>{count}</span>
            <button onClick={() => ++count}>++</button>
            <button onClick={() => count--}>--</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__dirty.add("count")');
  });

  test('compound assignment operators are tracked as mutations', () => {
    const source = `
      function App() {
        let count = 0;
        return () => (
          <div>
            <span>{count}</span>
            <button onClick={() => count += 2}>+=</button>
            <button onClick={() => count -= 1}>-=</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__dirty.add("count")');
  });

  test('external shared state updates subscribers without rerendering unrelated siblings', async () => {
    const source = `
      const state = { count: 0 };

      function Counter() {
        return () => <button id="counter" onClick={() => { state.count++; }}>Counter: {state.count}</button>;
      }

      function NestedReader() {
        return () => <button id="nested" onClick={() => { state.count++; }}>Nested: {state.count}</button>;
      }

      function Nested() {
        return () => <section><NestedReader /></section>;
      }

      function InputPatch() {
        let text = 'Edit me';
        let renders = 0;
        return () => {
          renders++;
          return (
            <section>
              <input id="input" value={text} onInput={(event) => { text = (event.target as HTMLInputElement).value; }} />
              <p id="renders">Renders: {renders}</p>
            </section>
          );
        };
      }

      function App() {
        return () => <main><Counter /><Nested /><InputPatch /></main>;
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#counter')!.textContent).toBe('Counter: 0');
    expect(root.querySelector('#nested')!.textContent).toBe('Nested: 0');
    expect(root.querySelector('#renders')!.textContent).toBe('Renders: 1');

    root.querySelector('#nested')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('#counter')!.textContent).toBe('Counter: 1');
    expect(root.querySelector('#nested')!.textContent).toBe('Nested: 1');
    expect(root.querySelector('#renders')!.textContent).toBe('Renders: 1');

    const input = root.querySelector('#input') as HTMLInputElement;
    input.value = 'Changed';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await new Promise<void>((resolve) => setTimeout(resolve, 25));

    expect(root.querySelector('#renders')!.textContent).toBe('Renders: 2');
  });

  test('compiles render-local keyed maps without hoisting locals out of scope', async () => {
    const source = `
      function PostList() {
        const loader = { value: [{ id: 1, title: 'Hello' }, { id: 2, title: 'World' }] };
        return () => {
          const posts = loader.value ?? [];
          return (
            <ul>
              {posts.map((post) => <li key={post.id}>{post.title}</li>)}
            </ul>
          );
        };
      }
      exports.PostList = PostList;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).toContain('let map');

    const { PostList } = evaluateCompiled(compiled) as { PostList: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(PostList as any));

    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.textContent).toBe('HelloWorld');
  });

  test('handler that mutates via property assignment falls back to __all', () => {
    const source = `
      function App() {
        let state = { count: 0 };
        return () => (
          <div>
            <span>{state.count}</span>
            <button onClick={() => state.count = state.count + 1}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // state is not a local variable declared in setup, so fallback to __all
    expect(compiled).toContain('__dirty.add("__all")');
  });
});
