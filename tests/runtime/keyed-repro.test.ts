import { describe, expect, test } from 'vitest';
import { __keyedMap } from '../../src/compiler-runtime/keyed-map';
import { __createBlock, __componentBlock } from '../../src/compiler-runtime/block';

describe('keyed input list reproduction', () => {
  test('reverse, shuffle, prepend, remove work', () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];

    const block = __componentBlock(() => {
      const el0 = document.createElement('section');
      const map0 = __keyedMap(
        items,
        (item) => item.id,
        (item, index) => __createBlock(() => {
          const row = document.createElement('div');
          const span = document.createElement('span');
          const input = document.createElement('input');
          row.append(span, input);
          span.textContent = item.label;
          input.placeholder = `type in ${item.label}`;
          return {
            node: row,
            update(item: typeof items[number], index: number) {
              span.textContent = item.label;
              input.placeholder = `type in ${item.label}`;
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

    // First render
    const root = document.createElement('div');
    const node = block();
    root.appendChild(node);
    
    expect(root.querySelectorAll('span').length).toBe(3);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Alpha');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Gamma');

    // Reverse
    items.reverse();
    block();
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Gamma');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Alpha');

    // Shuffle (simulate)
    const item0 = items[0]!;
    items[0] = items[2]!;
    items[2] = item0;
    block();
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Alpha');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Gamma');

    // Remove first
    items.splice(0, 1);
    block();
    expect(root.querySelectorAll('span').length).toBe(2);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Gamma');

    // Prepend
    items.unshift({ id: 'new', label: 'New' });
    block();
    expect(root.querySelectorAll('span').length).toBe(3);
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('New');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('Beta');
    expect(root.querySelectorAll('span')[2]!.textContent).toBe('Gamma');
  });
});
