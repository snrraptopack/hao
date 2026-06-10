/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { commit, createMemoApp } from 'auwla';

describe('component basics & lifecycle', () => {
  test('setup runs once, render runs on every invalidation', async () => {
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

  test('todo app DX with arrays, map, and direct mutation', async () => {
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

  test('controlled input keeps focus and caret across event rerender', async () => {
    const root = document.createElement('div');
    document.body.append(root);

    function App() {
      let text = 'Edit me';

      return () => (
        <section>
          <input
            value={text}
            onInput={(event) => {
              text = (event.target as HTMLInputElement).value;
            }}
          />
          <p>{text}</p>
        </section>
      );
    }

    createMemoApp(root, <App />);

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    input.setSelectionRange(7, 7);
    input.value = 'Edit me!';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(8);
    expect(input.value).toBe('Edit me!');
    root.remove();
  });

  test('keeps unrelated sibling components cached unless a full commit is requested', async () => {
    const root = document.createElement('div');
    const shared = { count: 0 };
    let readerRenders = 0;

    function Reader() {
      return () => {
        readerRenders++;
        return <span id="reader">Reader: {shared.count}</span>;
      };
    }

    function ScopedMutator() {
      return () => (
        <button id="scoped" onClick={() => { shared.count++; }}>
          Scoped: {shared.count}
        </button>
      );
    }

    function FullMutator() {
      return () => (
        <button id="full" onClick={() => { shared.count++; commit(); }}>
          Full: {shared.count}
        </button>
      );
    }

    function App() {
      return () => (
        <section>
          <Reader />
          <ScopedMutator />
          <FullMutator />
        </section>
      );
    }

    createMemoApp(root, <App />);

    expect(root.querySelector('#reader')!.textContent).toBe('Reader: 0');
    expect(readerRenders).toBe(1);

    root.querySelector('#scoped')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('#reader')!.textContent).toBe('Reader: 0');
    expect(readerRenders).toBe(1);

    root.querySelector('#full')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('#reader')!.textContent).toBe('Reader: 2');
    expect(readerRenders).toBe(2);
  });

  test('types common JSX props as plain values', () => {
    const input = <input type="checkbox" checked={true} onChange={(event) => void event.currentTarget} />;
    const link = <a href="/docs" data-active={true} aria-label="Docs">Docs</a>;

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(link).toBeInstanceOf(HTMLAnchorElement);
  });
});
