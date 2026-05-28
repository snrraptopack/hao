/** @jsxImportSource auwla */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createMemoApp } from 'auwla';
import { event } from 'auwla/events';

describe('event chain with controlled inputs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('debounced input keeps native typing responsive until state commits', async () => {
    vi.useFakeTimers();

    function App() {
      let query = '';

      return () => (
        <input
          value={query}
          onInput={event.input.debounce(100).handler((inputEvent) => {
            query = (inputEvent.target as HTMLInputElement).value;
          })}
        />
      );
    }

    const root = document.createElement('div');
    createMemoApp(root, <App />);
    const input = root.querySelector('input')!;

    input.value = 'a';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    input.value = 'ab';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    input.value = 'abc';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(input.value).toBe('abc');

    vi.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(input.value).toBe('abc');
  });

  test('debounced input state is current if another render happens before the debounce settles', async () => {
    vi.useFakeTimers();
    function App() {
      let query = '';
      let count = 0;

      return () => (
        <div>
          <input
            value={query}
            onInput={event.input.debounce(100).handler((inputEvent) => {
              query = (inputEvent.target as HTMLInputElement).value;
            })}
          />
          <button onClick={() => {
            count++;
          }}>
            {count}
          </button>
        </div>
      );
    }

    const root = document.createElement('div');
    const app = createMemoApp(root, <App />);
    const input = root.querySelector('input')!;

    input.value = 'abcdef';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    app.render();

    expect(input.value).toBe('abcdef');
  });
});
