/** @jsxImportSource auwla */
import { describe, expect, test, vi } from 'vitest';
import { createMemoApp } from 'auwla';

describe('event throttling', () => {
  test('throttles high-frequency input events to one render per frame', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] });

    try {
      const root = document.createElement('div');
      let renderCount = 0;
      let text = '';
      let inputCount = 0;

      function App() {
        return () => {
          renderCount++;
          return (
            <input
              value={text}
              onInput={(e) => {
                inputCount++;
                text = (e.target as HTMLInputElement).value;
              }}
            />
          );
        };
      }

      createMemoApp(root, <App />);
      expect(renderCount).toBe(1);

      const input = root.querySelector('input') as HTMLInputElement;

      input.value = 'a';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = 'ab';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = 'abc';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(inputCount).toBe(3);
      expect(renderCount).toBe(1);

      vi.advanceTimersByTime(16);
      await Promise.resolve();

      expect(renderCount).toBe(2);
      expect(text).toBe('abc');
    } finally {
      vi.useRealTimers();
    }
  });

  test('low-frequency click events still invalidate immediately', async () => {
    const root = document.createElement('div');
    let count = 0;

    function App() {
      return () => (
        <button onClick={() => { count++; }}>Click</button>
      );
    }

    createMemoApp(root, <App />);

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(count).toBe(1);
  });
});
