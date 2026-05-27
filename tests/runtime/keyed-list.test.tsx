/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';

describe('keyed list rendering', () => {
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
});
