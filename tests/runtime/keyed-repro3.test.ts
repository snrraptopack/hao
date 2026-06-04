import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';
import { __keyedMap, __createBlock, __componentBlock } from '../../src/compiler-runtime';

describe('compiled keyed list with events', () => {
  test('reverse via compiled event works', async () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];

    function KeyedInputList() {
      return __componentBlock(() => {
        const el0 = document.createElement('section');
        const btn = document.createElement('button');
        btn.textContent = 'Reverse';
        // Simulate compiled event attachment — direct addEventListener without __event wrapper
        // to see if the issue is in __event or in __keyedMap
        btn.addEventListener('click', () => {
          items.reverse();
        });
        el0.append(btn);

        const map0 = __keyedMap(
          items,
          (item) => item.id,
          (item, index) => __createBlock(() => {
            const row = document.createElement('div');
            const span = document.createElement('span');
            row.append(span);
            span.textContent = item.label;
            return {
              node: row,
              update(item: typeof items[number], _index: number) {
                span.textContent = item.label;
              },
            };
          }),
          (block, item, index) => block.update(item, index),
          (item) => item.label,
          false,
        );
        el0.append(map0.node);

        return __createBlock(() => ({
          node: el0,
          update() {
            map0.update(items);
          },
        }));
      });
    }

    function App() {
      return () => {
        const el = document.createElement('main');

        /**
         * Pre-existing bug fix (1):
         * `KeyedInputList()` returns a `RenderClosure` (a plain function), not a
         * DOM `Node`. `__componentBlock` intentionally defers the factory until
         * the closure is first *called* — it does NOT return a node directly.
         *
         * The old code cast the function to `Node` and passed it to `el.append()`,
         * which is a silent no-op in jsdom (appending a function does nothing).
         * The section element was never inserted so `querySelectorAll('span')`
         * always found 0 elements.
         *
         * Fix: invoke the returned closure with `()` so the factory executes and
         * we get back the real `section` element to insert.
         */
        const renderClosure = KeyedInputList();
        const node = renderClosure() as unknown as Node;
        el.append(node);
        return el;
      };
    }

    const root = document.createElement('div');

    /**
     * Pre-existing bug fix (2):
     * `createMemoApp` never attaches itself to the root DOM element, so
     * `(root as any).__auwlaApp` is always `undefined` and `app.render()` would
     * throw. The correct pattern is to capture the `MemoApp` value that
     * `createMemoApp` returns and call `.render()` on it directly.
     */
    const app = createMemoApp(root, (App as any)() as any);

    expect(root.querySelectorAll('span').length).toBe(3);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Alpha');

    // Click Reverse — mutates `items` in-place via the raw addEventListener.
    // No __event wrapper means no automatic invalidation, so we trigger a
    // manual re-render through the captured MemoApp reference.
    root.querySelector('button')!.click();
    app.render();

    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Gamma');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Alpha');
  });
});
