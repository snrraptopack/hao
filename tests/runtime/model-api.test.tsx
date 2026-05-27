/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';

describe('model API', () => {
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
});
