/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';

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

    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'Ship it';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    root.querySelector('form')!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.textContent).toContain('Ship it');

    const checkbox = root.querySelector('li input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('li')!.className).toBe('completed');
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
