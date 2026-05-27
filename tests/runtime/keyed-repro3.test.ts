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
              update(item: typeof items[number], index: number) {
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
        el.append((KeyedInputList as any)() as Node);
        return el;
      };
    }

    const root = document.createElement('div');
    createMemoApp(root, (App as any)() as any);

    expect(root.querySelectorAll('span').length).toBe(3);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Alpha');

    // Click Reverse — but this won't trigger re-render because we used plain addEventListener!
    root.querySelector('button')!.click();
    // Manually trigger re-render
    const app = (root as any).__auwlaApp;
    if (app && app.render) app.render();

    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Gamma');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Alpha');
  });
});
