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

  test('recomputes derived Map collection reads after an event mutation', async () => {
    const source = `
      function App() {
        const categories = new Map([[1, 'Health']]);
        let categoryCounts = [...new Set(categories.values())].map(name => ({
          name,
          count: [...categories.values()].filter(category => category === name).length,
        }));

        function addHealthCategory() {
          categories.set(2, 'Health');
        }

        return () => (
          <div>
            <span id="counts">{categoryCounts.map(category => category.name + ':' + category.count).join(',')}</span>
            <button onClick={() => addHealthCategory()}>Add</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain("__computed(() => [...new Set(categories.values())]");
    expect(compiled).toContain("['categories']");

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#counts')!.textContent).toBe('Health:1');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#counts')!.textContent).toBe('Health:2');
  });

  test('recomputes Set size and Map lookups after collection deletes', async () => {
    const source = `
      function App() {
        const categories = new Map([[1, 'Health']]);
        const starred = new Set([1]);
        let starredCount = starred.size;
        let firstCategory = categories.get(1) ?? 'None';

        function removeHabit() {
          categories.delete(1);
          starred.delete(1);
        }

        return () => (
          <div>
            <span id="starred">{starredCount}</span>
            <span id="category">{firstCategory}</span>
            <button onClick={() => removeHabit()}>Remove</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__computed(() => starred.size, [\'starred\'])');
    expect(compiled).toContain('__computed(() => categories.get(1) ?? \'None\', [\'categories\'])');

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#starred')!.textContent).toBe('1');
    expect(root.querySelector('#category')!.textContent).toBe('Health');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#starred')!.textContent).toBe('0');
    expect(root.querySelector('#category')!.textContent).toBe('None');
  });

  test('does not wrap mutable collections that reference locals in computed getters', async () => {
    const source = `
      function App() {
        const alice = { name: 'Alice' };
        const bob = { name: 'Bob' };
        const selected = new Set([alice]);
        let selectedNames = [...selected].map(p => p.name).join(', ') || '(none)';

        function toggleSelected(person: any) {
          if (selected.has(person)) selected.delete(person);
          else selected.add(person);
        }

        return () => (
          <div>
            <span id="names">{selectedNames}</span>
            <button id="alice" onClick={() => toggleSelected(alice)}>Toggle Alice</button>
            <button id="bob" onClick={() => toggleSelected(bob)}>Toggle Bob</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // The mutable Set should stay a plain variable, not become a computed getter.
    expect(compiled).toContain('const selected = new Set([alice])');
    expect(compiled).not.toContain('const selected = __computed');
    // The derived read should still be a computed getter.
    expect(compiled).toContain('__computed(() => [...selected].map(p => p.name).join(\', \') || \'(none)\', [\'selected\'])');

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#names')!.textContent).toBe('Alice');

    root.querySelector('#alice')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#names')!.textContent).toBe('(none)');

    root.querySelector('#alice')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#names')!.textContent).toBe('Alice');

    root.querySelector('#bob')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#names')!.textContent).toBe('Alice, Bob');
  });

  test('updates keyed-row classes after a helper toggles an item property', async () => {
    const source = `
      function App() {
        const habits = [{ id: 1, done: false, name: 'Walk' }];

        function toggleHabit(habit) {
          habit.done = !habit.done;
        }

        return () => (
          <ul>{habits.map(habit => (
            <li key={habit.id} class={habit.done ? 'done' : 'pending'}>
              <button onClick={() => toggleHabit(habit)}>{habit.name}</button>
            </li>
          ))}</ul>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const habit = root.querySelector('li')!;
    expect(habit.className).toBe('pending');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(habit.className).toBe('done');
  });

  test('dangerouslySetInnerHTML with derived html calls the computed getter once', () => {
    const source = `
      function DocPage() {
        const loader = { value: '<p>Hello</p>' };
        const html = loader?.value || '';
        return () => (
          <article dangerouslySetInnerHTML={{ __html: html }} />
        );
      }
      exports.DocPage = DocPage;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('innerHTML = ({ __html: html() })?.__html');
    expect(compiled).not.toContain('html()()');
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

describe('Auwla Islands Architecture', () => {
  test('static components in islands ssr mode render to raw html', () => {
    const source = `
      function StaticComp() {
        return <div>Hello Static</div>;
      }
      exports.StaticComp = StaticComp;
    `;
    const compiled = compileAuwla(source, 'static.tsx', { ssr: true, islands: true });
    expect(compiled).toContain('__ssrBlock');
    expect(compiled).not.toContain('data-auwla-island');
    expect(compiled).toContain('Hello Static');
  });

  test('reactive components in islands ssr mode render with island wrappers and props', () => {
    const source = `
      function Counter(props: { initial: number }) {
        let count = props.initial;
        return <button onClick={() => count++}>Count: {count}</button>;
      }
      exports.Counter = Counter;
    `;
    const compiled = compileAuwla(source, 'counter.tsx', { ssr: true, islands: true });
    expect(compiled).toContain('data-auwla-island="Counter"');
    expect(compiled).toContain('data-props="${__escapeHtml(JSON.stringify((props ?? {})))}"');
    expect(compiled).not.toContain('data-props="\\${__escapeHtml');

    const { Counter } = evaluateCompiled(compiled) as { Counter: (props: { initial: number }) => unknown };
    const html = String(Counter({ initial: 7 }));
    expect(html).toContain('data-props="{&quot;initial&quot;:7}"');
    expect(html).not.toContain('${__escapeHtml');
  });

  test('destructured props in reactive components are correctly serialized in islands ssr mode', () => {
    const source = `
      function Counter({ initial, step }) {
        let count = initial;
        return <button onClick={() => count += step}>Count: {count}</button>;
      }
      exports.Counter = Counter;
    `;
    const compiled = compileAuwla(source, 'counter.tsx', { ssr: true, islands: true });
    expect(compiled).toContain('data-auwla-island="Counter"');
    expect(compiled).toContain('JSON.stringify({ "initial": initial, "step": step })');
  });

  test('arrow function components use their variable name as island id', () => {
    const source = `
      const Counter = (props) => {
        let count = props.initial;
        return <button onClick={() => count++}>Count: {count}</button>;
      };
      exports.Counter = Counter;
    `;
    const compiled = compileAuwla(source, 'counter.tsx', { ssr: true, islands: true });
    expect(compiled).toContain('data-auwla-island="Counter"');
    expect(compiled).not.toContain('AnonymousIsland');
  });

  test('no-prop island components serialize empty props object', () => {
    const source = `
      function Counter() {
        let count = 0;
        return <button onClick={() => count++}>Count: {count}</button>;
      }
      exports.Counter = Counter;
    `;
    const compiled = compileAuwla(source, 'counter.tsx', { ssr: true, islands: true });
    expect(compiled).toContain('JSON.stringify({})');
  });

  test('static components in client islands mode compile normally for router hydration', () => {
    const source = `
      function StaticComp() {
        return <div>Hello Static</div>;
      }
      exports.StaticComp = StaticComp;
    `;
    const compiled = compileAuwla(source, 'static.tsx', { ssr: false, islands: true });
    expect(compiled).not.toContain('function StaticComp() { return null; }');
    expect(compiled).toContain('__componentBlock');
  });

  test('hydrateIslands resolves and boots elements carrying data-auwla-island', async () => {
    const { hydrateIslands } = await import('../../src/runtime/islands');

    const root = document.createElement('div');
    root.innerHTML = `
      <div data-auwla-island="Counter" data-props="{&quot;initial&quot;:10}">
        <button>Count: 10</button>
      </div>
    `;
    document.body.appendChild(root);

    const CounterMock = (props: { initial: number }) => {
      let count = props.initial;
      return () => h('button', { onClick: () => count++ }, 'Count: ', count);
    };

    hydrateIslands((name) => {
      if (name === 'Counter') return CounterMock;
      return null;
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    let button = root.querySelector('button')!;
    expect(button.textContent).toBe('Count: 10');

    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    button = root.querySelector('button')!;
    expect(button.textContent).toBe('Count: 11');

    document.body.removeChild(root);
  });

  test('hydrateIslands resolves object-shaped island registries', async () => {
    const { hydrateIslands } = await import('../../src/runtime/islands');

    const root = document.createElement('div');
    root.innerHTML = `
      <div data-auwla-island="ObjectRegistryCounter" data-props="{&quot;initial&quot;:4}">
        <button>Count: 4</button>
      </div>
    `;
    document.body.appendChild(root);

    const previous = (globalThis as any).__auwla_islandModules;
    const previousObserver = (globalThis as any).IntersectionObserver;
    (globalThis as any).IntersectionObserver = undefined;
    (globalThis as any).__auwla_islandModules = {
      ObjectRegistryCounter: {
        load: async () => ({
          ObjectRegistryCounter: (props: { initial: number }) => {
            let count = props.initial;
            return () => h('button', { onClick: () => count++ }, 'Hydrated: ', count);
          },
        }),
      },
    };

    hydrateIslands();
    for (let i = 0; i < 5; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    let button = root.querySelector('button')!;
    expect(button.textContent).toBe('Hydrated: 4');
    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    button = root.querySelector('button')!;
    expect(button.textContent).toBe('Hydrated: 5');

    (globalThis as any).__auwla_islandModules = previous;
    (globalThis as any).IntersectionObserver = previousObserver;
    document.body.removeChild(root);
  });

  test('createMemoApp hydrates island roots while preserving the SSR app shell', async () => {
    const { createMemoApp } = await import('../../src/runtime/app');

    const root = document.createElement('div');
    root.setAttribute('data-auwla-ssr', 'true');
    root.innerHTML = `
      <section>
        <p class="static-copy">Static SSR copy</p>
        <div data-auwla-island="Counter" data-props="{&quot;initial&quot;:2}">
          <button>Count: 2</button>
        </div>
      </section>
    `;
    document.body.appendChild(root);

    const previous = (globalThis as any).__auwla_islandModules;
    (globalThis as any).__auwla_islandModules = [{
      exports: {
        Counter: (props: { initial: number }) => {
          let count = props.initial;
          return () => h('button', { onClick: () => count++ }, 'Count: ', count);
        },
      },
    }];

    createMemoApp(root, () => h('section', null,
      h('p', { class: 'static-copy' }, 'Static SSR copy'),
      h('div', { 'data-auwla-island': 'Counter', 'data-props': '{"initial":2}' },
        h('button', null, 'Count: 2'),
      ),
    ));
    for (let i = 0; i < 5; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    expect(root.querySelector('.static-copy')?.textContent).toBe('Static SSR copy');
    const button = root.querySelector('button')!;
    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(button.textContent).toBe('Count: 3');

    (globalThis as any).__auwla_islandModules = previous;
    document.body.removeChild(root);
  });
});

