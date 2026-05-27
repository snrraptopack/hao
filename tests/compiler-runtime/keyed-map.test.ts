import { describe, expect, test } from 'vitest';
import { __keyedMap } from '../../src/compiler-runtime/keyed-map';
import { __createBlock } from '../../src/compiler-runtime/block';

describe('__keyedMap fast paths', () => {
  function createRow(label: string) {
    const el = document.createElement('li');
    el.textContent = label;
    return __createBlock(() => ({
      node: el,
      update(item: { label: string }) {
        el.textContent = item.label;
      },
    }));
  }

  test('empty list clears rows', () => {
    const items = [{ id: 'a', label: 'A' }];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    expect(parent.querySelectorAll('li').length).toBe(1);

    map.update([]);
    expect(parent.querySelectorAll('li').length).toBe(0);
  });

  test('empty list clearing preserves siblings around embedded map', () => {
    const items = [{ id: 'a', label: 'A' }];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('div');
    const before = document.createElement('input');
    const after = document.createElement('button');
    after.textContent = 'Save';
    parent.append(before, map.node, after);
    document.body.append(parent);

    before.focus();
    map.update([]);

    expect(parent.querySelector('input')).toBe(before);
    expect(parent.querySelector('button')).toBe(after);
    expect(parent.querySelectorAll('li')).toHaveLength(0);
    expect(document.activeElement).toBe(before);
    parent.remove();
  });

  test('append-only adds new rows at end', () => {
    let items = [{ id: 'a', label: 'A' }];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    const firstLi = parent.querySelector('li');

    items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    map.update(items);

    const lis = parent.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0]).toBe(firstLi);
    expect(lis[1]!.textContent).toBe('B');
  });

  test('empty-to-populated insert batches rows in one fragment', () => {
    const map = __keyedMap(
      [] as { id: string; label: string }[],
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);
    const originalInsertBefore = parent.insertBefore.bind(parent);
    let inserts = 0;
    let insertedFragment = false;
    parent.insertBefore = ((node: Node, child: Node | null) => {
      inserts++;
      insertedFragment ||= node instanceof DocumentFragment;
      return originalInsertBefore(node, child);
    }) as typeof parent.insertBefore;

    map.update([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ]);

    expect(inserts).toBe(1);
    expect(insertedFragment).toBe(true);
    expect(Array.from(parent.querySelectorAll('li')).map((node) => node.textContent)).toEqual(['A', 'B', 'C']);
  });

  test('same-length in-place update', () => {
    let items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    const initial = Array.from(parent.querySelectorAll('li'));

    items = [{ id: 'a', label: 'A2' }, { id: 'b', label: 'B2' }];
    map.update(items);

    const updated = Array.from(parent.querySelectorAll('li'));
    expect(updated.length).toBe(2);
    expect(updated[0]).toBe(initial[0]);
    expect(updated[1]).toBe(initial[1]);
    expect(updated[0]!.textContent).toBe('A2');
    expect(updated[1]!.textContent).toBe('B2');
  });

  test('swap two rows', () => {
    let items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    const initial = Array.from(parent.querySelectorAll('li'));

    items = [{ id: 'b', label: 'B' }, { id: 'a', label: 'A' }];
    map.update(items);

    const updated = Array.from(parent.querySelectorAll('li'));
    expect(updated[0]).toBe(initial[1]);
    expect(updated[1]).toBe(initial[0]);
  });

  test('general reorder with LIS', () => {
    let items = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    const initial = Array.from(parent.querySelectorAll('li'));

    // Reverse order
    items = [
      { id: 'c', label: 'C' },
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ];
    map.update(items);

    const updated = Array.from(parent.querySelectorAll('li'));
    expect(updated.length).toBe(3);
    expect(updated[0]).toBe(initial[2]);
    expect(updated[1]).toBe(initial[1]);
    expect(updated[2]).toBe(initial[0]);
  });

  test('removes rows not in new list', () => {
    let items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => block.update(item),
      null,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    const removedLi = parent.querySelectorAll('li')[1];

    items = [{ id: 'a', label: 'A' }];
    map.update(items);

    expect(parent.querySelectorAll('li').length).toBe(1);
    expect(removedLi!.parentNode).toBeNull();
  });

  test('deps optimization skips unchanged rows', () => {
    let items = [{ id: 'a', label: 'A', extra: 1 }];
    let updateCount = 0;

    const map = __keyedMap(
      items,
      (item) => item.id,
      (item) => createRow(item.label),
      (block, item) => {
        updateCount++;
        block.update(item);
      },
      (item) => item.label,
    );

    const parent = document.createElement('ul');
    parent.appendChild(map.node);

    expect(updateCount).toBe(1); // initial update

    // Same label, different extra — should skip update
    items = [{ id: 'a', label: 'A', extra: 2 }];
    map.update(items);

    expect(updateCount).toBe(1); // no additional update

    // Different label — should update
    items = [{ id: 'a', label: 'A2', extra: 2 }];
    map.update(items);

    expect(updateCount).toBe(2);
  });
});
