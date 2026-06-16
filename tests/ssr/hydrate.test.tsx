import { describe, expect, test } from 'vitest';
import { renderToString, hydrate } from '../../src/ssr';
import { h } from '../../src';

describe('hydrate', () => {
  test('mounts an app into existing server-rendered HTML', async () => {
    let clicks = 0;

    function App() {
      return () => (
        <button onClick={() => clicks++}>Click me</button>
      );
    }

    const root = document.createElement('div');
    root.innerHTML = await renderToString(h(App));
    expect(root.querySelector('button')!.textContent).toBe('Click me');

    const app = hydrate({ root, app: h(App) });

    root.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Wait for the microtask-based render cycle.
    await new Promise((resolve) => queueMicrotask(resolve));

    expect(clicks).toBe(1);
    app.destroy();
  });
});
