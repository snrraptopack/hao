/** @jsxImportSource auwla */
import { describe, expect, test, vi } from 'vitest';
import {
  __componentBlock,
  __createBlock,
  __event,
  __keyedMap,
  __setClass,
  __setProperty,
  __setStyle,
  __setText,
  createMemoApp,
  type CompiledBlock,
} from '../src';

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('compiler runtime helpers', () => {
  test('component blocks create DOM once and update direct dynamic fields', async () => {
    const root = document.createElement('div');
    let count = 0;

    function Counter() {
      return __componentBlock(() => {
        const button = document.createElement('button');
        const text = document.createTextNode('');
        button.append(text);
        button.addEventListener('click', __event(() => {
          count++;
        }));

        return __createBlock(() => ({
          node: button,
          update() {
            __setClass(button, count % 2 ? 'odd' : 'even');
            __setText(text, `Count: ${count}`);
          },
        }));
      });
    }

    createMemoApp(root, <Counter />);
    const button = root.querySelector('button')!;

    expect(button.textContent).toBe('Count: 0');
    expect(button.className).toBe('even');

    button.click();
    await tick();

    expect(root.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Count: 1');
    expect(button.className).toBe('odd');
  });

  test('direct property and style setters patch known mutation sites', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    const label = document.createElement('label');

    __setProperty(input, 'checked', true);
    __setProperty(input, 'disabled', true);
    __setStyle(label, 'color', 'red');
    __setStyle(label, 'paddingLeft', 8);

    expect(input.checked).toBe(true);
    expect(input.hasAttribute('checked')).toBe(true);
    expect(input.disabled).toBe(true);
    expect(label.style.color).toBe('red');
    expect(label.style.paddingLeft).toBe('8px');

    __setProperty(input, 'checked', false);
    expect(input.checked).toBe(false);
    expect(input.hasAttribute('checked')).toBe(false);
  });

  test('__setProperty skips unchanged values to avoid side effects', () => {
    const input = document.createElement('input');

    // Setting a new value works
    __setProperty(input, 'value', 'hello');
    expect(input.value).toBe('hello');

    // Track whether the value setter was conceptually invoked by checking
    // that setting the same value does not mutate the element. We do this
    // by observing a side-effect-free marker: selectionStart resets when
    // value is assigned, so we set a known selection and verify it survives.
    input.value = 'hello';
    input.setSelectionRange(2, 2);
    __setProperty(input, 'value', 'hello');
    expect(input.selectionStart).toBe(2);

    // Changing to a different value should still work
    __setProperty(input, 'value', 'world');
    expect(input.value).toBe('world');
  });

  test('keyed map reuses, moves, removes, and dependency-skips row blocks', () => {
    type Item = { id: string; label: string; done: boolean };
    const root = document.createElement('ul');
    const updates = vi.fn();
    let items: Item[] = [
      { id: 'a', label: 'A', done: false },
      { id: 'b', label: 'B', done: false },
      { id: 'c', label: 'C', done: false },
    ];

    const map = __keyedMap(
      items,
      (item) => item.id,
      () => {
        const li = document.createElement('li');
        const text = document.createTextNode('');
        li.append(text);

        return {
          node: li,
          update(item) {
            updates(item.id);
            __setClass(li, item.done ? 'done' : '');
            __setText(text, item.label);
          },
        } satisfies CompiledBlock<[Item, number]>;
      },
      (block, item, index) => block.update(item, index),
      (item) => [item.label, item.done],
    );

    root.append(map.node);
    map.update(items);

    const initial = Array.from(root.querySelectorAll('li'));
    expect(initial.map((node) => node.textContent)).toEqual(['A', 'B', 'C']);
    expect(updates).toHaveBeenCalledTimes(3);

    items = [items[2]!, items[0]!, { ...items[1]!, label: 'B2', done: true }];
    map.update(items);

    const moved = Array.from(root.querySelectorAll('li'));
    expect(moved.map((node) => node.textContent)).toEqual(['C', 'A', 'B2']);
    expect(moved[0]).toBe(initial[2]);
    expect(moved[1]).toBe(initial[0]);
    expect(moved[2]).toBe(initial[1]);
    expect(moved[2]!.className).toBe('done');
    expect(updates.mock.calls.slice(-1)).toEqual([['b']]);

    items = [items[1]!];
    map.update(items);

    expect(Array.from(root.querySelectorAll('li')).map((node) => node.textContent)).toEqual(['A']);
    expect(root.querySelector('li')).toBe(initial[0]);
  });
});
