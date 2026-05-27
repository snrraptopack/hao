/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';

describe('keyed list in compiled component', () => {
  test('reverse, shuffle, prepend, remove work via event', async () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];

    function KeyedInputList() {
      return () => (
        <section>
          <div>
            <button onClick={() => items.reverse()}>Reverse</button>
            <button onClick={() => items.sort(() => Math.random() - 0.5)}>Shuffle</button>
            <button onClick={() => items.splice(0, 1)}>Remove First</button>
            <button onClick={() => items.unshift({ id: Date.now().toString(), label: 'New' })}>Prepend</button>
          </div>
          {items.map((item) => (
            <div key={item.id}>
              <span>{item.label}</span>
              <input placeholder={`type in ${item.label}`} />
            </div>
          ))}
        </section>
      );
    }

    function App() {
      return () => (
        <main>
          <KeyedInputList />
        </main>
      );
    }

    const root = document.createElement('div');
    createMemoApp(root, <App />);

    expect(root.querySelectorAll('span').length).toBe(3);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Alpha');

    // Click Reverse
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Gamma');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Alpha');

    // Click Remove First
    root.querySelectorAll('button')[2]!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelectorAll('span').length).toBe(2);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Alpha');

    // Click Prepend
    root.querySelectorAll('button')[3]!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelectorAll('span').length).toBe(3);
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Alpha');
  });
});
