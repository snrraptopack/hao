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

  test('inlines closure-returning components with no setup state', () => {
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
    // Label JSX is inlined — App directly creates the span
    expect(compiled).not.toContain('<Label');
    expect(compiled).toContain('__hydrateElement("span")');
    expect(compiled).toContain('__setElementText(el0, "Hello")');
  });

  test('leaves components with setup state for runtime fallback', () => {
    const source = `
      function Label(props) {
        const self = component();
        return () => <span>{props.text}</span>;
      }

      function App() {
        return () => <Label text="Hello" />;
      }
    `;

    const compiled = compileAuwla(source);

    // Label has setup code (component() call), so it cannot be inlined
    expect(compiled).toContain('<Label text="Hello" />');
  });

  test('compiles text-only ternary expressions as text nodes', () => {
    const source = `
      function App() {
        let active = false;
        exports.toggle = () => { active = !active; };
        return () => <span>{active ? 'On' : 'Off'}</span>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setElementText');
    // Slice after the import line to avoid matching __setChild in the import list
    const importEnd = compiled.indexOf('\nfunction App');
    const bodyAfterImport = compiled.slice(importEnd);
    expect(bodyAfterImport).not.toContain('__setChild');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('Off');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('On');
  });

  test('compiles text-only logical expressions as text nodes', () => {
    const source = `
      function App() {
        let name = '';
        exports.setName = (n: string) => { name = n; };
        return () => <span>{name || 'Anonymous'}</span>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setElementText');
    // Slice after the import line to avoid matching __setChild in the import list
    const importEnd = compiled.indexOf('\nfunction App');
    const bodyAfterImport = compiled.slice(importEnd);
    expect(bodyAfterImport).not.toContain('__setChild');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; setName(n: string): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('Anonymous');

    evaluated.setName('Ada');
    app.render();

    expect(root.textContent).toBe('Ada');
  });

  test('keeps JSX ternary expressions on __setChild path', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? <span>Yes</span> : <span>No</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setChild');
  });

  test('keeps JSX logical expressions on __setChild path', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show && <span>Visible</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setChild');
  });

  test('keeps render-local variables in scope for compiled patches', async () => {
    const source = `
      function LinkLike(props) {
        return () => {
          const classes = props.active ? 'active' : undefined;
          return <a class={classes}>{props.label}</a>;
        };
      }
      exports.LinkLike = LinkLike;
    `;

    const { LinkLike } = evaluateCompiled(compileAuwla(source)) as { LinkLike: (props: unknown) => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(LinkLike as any, { active: true, label: 'Docs' }));

    expect(root.querySelector('a')!.className).toBe('active');
    expect(root.textContent).toBe('Docs');
  });

  test('preserves pre-return statements in block-bodied render closures', () => {
    const source = `
      function App() {
        let count = 0;
        exports.bump = () => { count++; };
        return () => {
          count = count * 2;
          return <span>{count}</span>;
        };
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('count = count * 2');
    expect(compiled).toContain('__setElementText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; bump(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('0');

    evaluated.bump();
    app.render();

    expect(root.textContent).toBe('2');
  });

  test('manual app.render() forces a full re-render without a tracked event', () => {
    const source = `
      function App() {
        let active = false;
        exports.toggle = () => { active = !active; };
        return () => <span>{active ? 'On' : 'Off'}</span>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setElementText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('Off');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('On');
  });

  test('recomputes derived arrays filtered from local state', async () => {
    const source = `
      function TodoApp() {
        const todos = [{ id: 1, text: 'Learn Auwla', done: false }];
        const pendingTodos = todos.filter(it => it.done === false);
        return () => (
          <div>
            {pendingTodos.length === 0 && <p>All done</p>}
            <ul>
              {todos.map((todo) => (
                <li key={todo.id}>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => { todo.done = !todo.done; }}
                  />
                  <span>{todo.text}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }
      exports.TodoApp = TodoApp;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('todos.filter');

    const { TodoApp } = evaluateCompiled(compiled) as { TodoApp: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(TodoApp as any));

    expect(root.querySelector('p')).toBeNull();

    const checkbox = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('p')!.textContent).toBe('All done');
  });

  test('transforms conditional assignment into a computed getter', async () => {
    const source = `
      function App() {
        let user = null;

        let message;
        if (user) {
          message = \`Hi \${user.name}\`;
        } else {
          message = 'Loading...';
        }

        function setUser() {
          user = { name: 'Ada' };
        }

        return () => <div><p>{message}</p><button onClick={setUser}>Load</button></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('let message = __computed(');
    expect(compiled).not.toContain('if (user)');

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('p')!.textContent).toBe('Loading...');

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('p')!.textContent).toBe('Hi Ada');
  });

  test('wraps side-effectful reactive if in __effect', async () => {
    const source = `
      function App() {
        let count = 0;
        let big = false;

        if (count > 10) {
          big = true;
        }

        function increment() {
          count++;
        }

        return () => <div><p>{big ? 'big' : 'small'}</p><button onClick={increment}>Inc</button></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__effect(() => {');
    expect(compiled).toContain('if (count > 10)');

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('p')!.textContent).toBe('small');

    for (let i = 0; i < 11; i++) {
      root.querySelector('button')!.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    }

    expect(root.querySelector('p')!.textContent).toBe('big');
  });

  test('Profile example: async load and theme toggle with derived displayName', async () => {
    const source = `
      import { component } from 'auwla';

      function Profile({ userId }: { userId: string }) {
        const self = component();

        let user  = null;
        let theme = 'red';

        async function loadUser() {
          user = await fetchUser(userId);
        }

        loadUser();

        let displayName = user
          ? \`\${user.firstName} \${user.lastName}\`
          : 'Loading...';

        function toggleTheme() {
          theme = theme === 'red' ? 'blue' : 'red';
        }

        return () => (
          <div style={{ color: theme }}>
            <p>{displayName}</p>
            <button onClick={toggleTheme}>Toggle theme</button>
          </div>
        );
      }

      function fetchUser(id: string) { return Promise.resolve({ firstName: 'Ada', lastName: 'Lovelace' }); }

      exports.Profile = Profile;
    `;

    const compiled = compileAuwla(source);

    const { Profile } = evaluateCompiled(compiled) as { Profile: (props: { userId: string }) => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(Profile as any, { userId: '123' }));

    expect(root.textContent).toContain('Loading...');

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.textContent).toContain('Ada Lovelace');

    const button = root.querySelector('button')!;
    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect((root.querySelector('div') as HTMLDivElement).style.color).toBe('blue');
  });
});
