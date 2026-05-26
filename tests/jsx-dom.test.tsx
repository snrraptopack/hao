/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp, component, commit } from 'auwla';

describe('typed JSX DOM runtime', () => {
  test('supports setup-once components with local closure state', async () => {
    const root = document.createElement('div');
    let setupCalls = 0;
    let renderCalls = 0;

    function Counter() {
      setupCalls++;
      let count = 0;

      return () => {
        renderCalls++;
        return (
          <button onClick={() => { count++; }}>
            Count: {count}
          </button>
        );
      };
    }

    createMemoApp(root, <Counter />);

    expect(setupCalls).toBe(1);
    expect(renderCalls).toBe(1);
    expect(root.textContent).toBe('Count: 0');

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(setupCalls).toBe(1);
    expect(renderCalls).toBe(2);
    expect(root.textContent).toBe('Count: 1');
  });

  test('supports todo app DX with arrays, map, and direct mutation', async () => {
    const root = document.createElement('div');

    function TodoApp() {
      const todos = [{ id: 1, text: 'Learn Auwla', done: false }];
      let newTodoText = '';

      return () => (
        <div class="todo-container">
          <form onSubmit={(event) => {
            event.preventDefault();
            todos.push({ id: 2, text: newTodoText, done: false });
            newTodoText = '';
          }}>
            <input
              value={newTodoText}
              onInput={(event) => {
                newTodoText = (event.target as HTMLInputElement).value;
              }}
            />
            <button type="submit">Add Task</button>
          </form>

          {todos.length === 0 && <p>All tasks completed!</p>}

          <ul>
            {todos.map((todo) => (
              <li key={todo.id} class={todo.done ? 'completed' : ''}>
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

    createMemoApp(root, <TodoApp />);

    expect(root.querySelectorAll('li')).toHaveLength(1);
    const initialItem = root.querySelector('li')!;
    const initialInput = root.querySelector('form input')!;

    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'Ship it';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    root.querySelector('form')!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.textContent).toContain('Ship it');
    expect(root.querySelector('li')).toBe(initialItem);
    expect(root.querySelector('form input')).toBe(initialInput);

    const checkbox = root.querySelector('ul input[type="checkbox"]') as HTMLInputElement;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('li')!.className).toBe('completed');
  });

  test('keeps nested component setup state across parent rerenders', async () => {
    const root = document.createElement('div');
    let parentSetupCalls = 0;
    let childSetupCalls = 0;

    function Counter() {
      childSetupCalls++;
      let count = 0;

      return () => (
        <button class="child" onClick={() => count++}>
          Child: {count}
        </button>
      );
    }

    function App() {
      parentSetupCalls++;
      let parentCount = 0;

      return () => (
        <section>
          <button class="parent" onClick={() => parentCount++}>
            Parent: {parentCount}
          </button>
          <Counter />
        </section>
      );
    }

    createMemoApp(root, <App />);

    expect(parentSetupCalls).toBe(1);
    expect(childSetupCalls).toBe(1);
    expect(root.textContent).toContain('Child: 0');

    root.querySelector<HTMLButtonElement>('.child')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.textContent).toContain('Child: 1');

    root.querySelector<HTMLButtonElement>('.parent')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(parentSetupCalls).toBe(1);
    expect(childSetupCalls).toBe(1);
    expect(root.textContent).toContain('Parent: 1');
    expect(root.textContent).toContain('Child: 1');
  });

  test('rerenders only the component path owned by an event', async () => {
    const root = document.createElement('div');
    let leftRenderCalls = 0;
    let rightRenderCalls = 0;

    function LeftCounter() {
      let count = 0;

      return () => {
        leftRenderCalls++;
        const doubled = count * 2;

        return (
          <button class="left" onClick={() => count++}>
            Left: {doubled}
          </button>
        );
      };
    }

    function RightCounter() {
      let count = 0;

      return () => {
        rightRenderCalls++;

        return (
          <button class="right" onClick={() => count++}>
            Right: {count}
          </button>
        );
      };
    }

    function App() {
      return () => (
        <section>
          <LeftCounter />
          <RightCounter />
        </section>
      );
    }

    createMemoApp(root, <App />);

    expect(leftRenderCalls).toBe(1);
    expect(rightRenderCalls).toBe(1);
    expect(root.querySelector('.left')!.textContent).toBe('Left: 0');

    root.querySelector<HTMLButtonElement>('.left')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(leftRenderCalls).toBe(2);
    expect(rightRenderCalls).toBe(1);
    expect(root.querySelector('.left')!.textContent).toBe('Left: 2');
    expect(root.querySelector('.right')!.textContent).toBe('Right: 0');
  });

  test('nested sibling child events update their own UI before parent rerenders', async () => {
    const root = document.createElement('div');
    let childSetupCalls = 0;
    let childRenderCalls = 0;

    function ChildCounter(props: { label: string }) {
      childSetupCalls++;
      let count = 0;

      return () => {
        childRenderCalls++;

        return (
          <button class="secondary" onClick={() => count++}>
            {props.label}: {count}
          </button>
        );
      };
    }

    function NestedStateExample() {
      let parentCount = 0;

      return () => (
        <section class="panel">
          <h2>Nested Components</h2>
          <p>Child setup runs once and keeps its own closure state across parent rerenders.</p>
          <div class="row">
            <button class="parent" onClick={() => parentCount++}>Parent: {parentCount}</button>
            <ChildCounter label="Child A" />
            <ChildCounter label="Child B" />
          </div>
        </section>
      );
    }

    createMemoApp(root, <NestedStateExample />);

    expect(childSetupCalls).toBe(2);
    expect(childRenderCalls).toBe(2);
    expect(root.querySelectorAll('.secondary')[0]!.textContent).toBe('Child A: 0');

    root.querySelectorAll<HTMLButtonElement>('.secondary')[0]!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(2);
    expect(childRenderCalls).toBe(3);
    expect(root.querySelectorAll('.secondary')[0]!.textContent).toBe('Child A: 1');
    expect(root.querySelectorAll('.secondary')[1]!.textContent).toBe('Child B: 0');

    root.querySelector<HTMLButtonElement>('.parent')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(2);
    expect(childRenderCalls).toBe(5); // 2 initial + 1 child-A click + 2 full re-render from parent click
    expect(root.querySelector('.parent')!.textContent).toBe('Parent: 1');
    expect(root.querySelectorAll('.secondary')[0]!.textContent).toBe('Child A: 1');
    expect(root.querySelectorAll('.secondary')[1]!.textContent).toBe('Child B: 0');
  });

  test('child instances survive when an unrelated sibling component rerenders', async () => {
    const root = document.createElement('div');
    let childSetupCalls = 0;

    function ChildCounter(props: { label: string }) {
      childSetupCalls++;
      let count = 0;

      return () => (
        <button class="child" onClick={() => count++}>
          {props.label}: {count}
        </button>
      );
    }

    function Parent() {
      let parentCount = 0;

      return () => (
        <div class="parent-panel">
          <button class="parent" onClick={() => parentCount++}>Parent: {parentCount}</button>
          <ChildCounter label="Child" />
        </div>
      );
    }

    function Unrelated() {
      let n = 0;

      return () => (
        <button class="unrelated" onClick={() => n++}>
          Unrelated: {n}
        </button>
      );
    }

    function App() {
      return () => (
        <main>
          <Parent />
          <Unrelated />
        </main>
      );
    }

    createMemoApp(root, <App />);

    expect(childSetupCalls).toBe(1);

    // Click child — works, count goes to 1
    root.querySelector<HTMLButtonElement>('.child')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(1);
    expect(root.querySelector('.child')!.textContent).toBe('Child: 1');

    // Click unrelated component — should NOT destroy child instance
    root.querySelector<HTMLButtonElement>('.unrelated')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(1); // setup must NOT re-run
    expect(root.querySelector('.child')!.textContent).toBe('Child: 1'); // state preserved

    // Click child again — must still work
    root.querySelector<HTMLButtonElement>('.child')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(1);
    expect(root.querySelector('.child')!.textContent).toBe('Child: 2');
  });

  test('commit(handle) re-renders the target component without affecting siblings', async () => {
    const root = document.createElement('div');
    let siblingRenderCalls = 0;
    let childRenderCalls = 0;

    function Child() {
      const self = component();
      let count = 0;

      // Simulate async data fetch on mount
      queueMicrotask(() => {
        count = 42;
        commit(self);
      });

      return () => {
        childRenderCalls++;
        return <span class="child-val">{count}</span>;
      };
    }

    function Sibling() {
      return () => {
        siblingRenderCalls++;
        return <span class="sibling-val">Sibling</span>;
      };
    }

    function App() {
      return () => (
        <div>
          <Child />
          <Sibling />
        </div>
      );
    }

    createMemoApp(root, <App />);

    expect(childRenderCalls).toBe(1);
    expect(siblingRenderCalls).toBe(1);
    expect(root.querySelector('.child-val')!.textContent).toBe('0');

    // Wait for the microtask (simulated async) to fire
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    // Child re-rendered with new data
    expect(childRenderCalls).toBe(2);
    expect(root.querySelector('.child-val')!.textContent).toBe('42');

    // Sibling was NOT re-rendered — commit(self) only affected the target path
    expect(siblingRenderCalls).toBe(1);
  });

  test('commit(h1, h2) re-renders multiple specific components', async () => {
    const root = document.createElement('div');
    let aRenderCalls = 0;
    let bRenderCalls = 0;
    let cRenderCalls = 0;

    let handleA: ReturnType<typeof component>;
    let handleB: ReturnType<typeof component>;

    function CompA() {
      handleA = component();
      let val = 'a0';
      return () => { aRenderCalls++; return <span class="a">{val}</span>; };
    }

    function CompB() {
      handleB = component();
      let val = 'b0';
      return () => { bRenderCalls++; return <span class="b">{val}</span>; };
    }

    function CompC() {
      return () => { cRenderCalls++; return <span class="c">c</span>; };
    }

    function App() {
      return () => (
        <div>
          <CompA />
          <CompB />
          <CompC />
        </div>
      );
    }

    createMemoApp(root, <App />);

    expect(aRenderCalls).toBe(1);
    expect(bRenderCalls).toBe(1);
    expect(cRenderCalls).toBe(1);

    // Commit only A and B — C should not re-render
    commit(handleA!, handleB!);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(aRenderCalls).toBe(2);
    expect(bRenderCalls).toBe(2);
    expect(cRenderCalls).toBe(1); // untouched
  });

  test('swaps keyed nodes without replacing unchanged nodes', () => {
    const root = document.createElement('div');
    const items = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'd', label: 'D' },
    ];

    function App() {
      return () => (
        <ul>
          {items.map((item) => <li key={item.id}>{item.label}</li>)}
        </ul>
      );
    }

    const app = createMemoApp(root, <App />);
    const before = Array.from(root.querySelectorAll('li'));

    const second = items[1]!;
    items[1] = items[3]!;
    items[3] = second;
    app.render();

    const after = Array.from(root.querySelectorAll('li'));
    expect(after.map((node) => node.textContent)).toEqual(['A', 'D', 'C', 'B']);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[3]);
    expect(after[2]).toBe(before[2]);
    expect(after[3]).toBe(before[1]);
  });

  test('renders JSX with plain model values and event invalidation', async () => {
    const root = document.createElement('div');
    const app = createMemoApp(root, { count: 0 }, ({ model }) => (
      <button className="count" onClick={() => { model.count += 1; }}>
        Count: {model.count}
      </button>
    ));

    expect(root.querySelector('button')!.className).toBe('count');
    expect(root.textContent).toBe('Count: 0');

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(app.model.count).toBe(1);
    expect(root.textContent).toBe('Count: 1');
  });

  test('types common JSX props as plain values', () => {
    const input = <input type="checkbox" checked={true} onChange={(event) => void event.currentTarget} />;
    const link = <a href="/docs" data-active={true} aria-label="Docs">Docs</a>;

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(link).toBeInstanceOf(HTMLAnchorElement);
  });
});
