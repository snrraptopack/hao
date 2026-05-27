import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('keyed list compilation', () => {
  test('moves key-derived row patches into row creation', () => {
    const source = `
      function List() {
        const items = [{ id: 1, value: 2 }];
        return () => (
          <div>
            {items.map((item) => (
              <div key={item.id}>
                <span>{item.id}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        );
      }
    `;

    const compiled = compileAuwla(source);
    const rowUpdate = compiled.slice(compiled.indexOf('update(item, index)'));

    expect(compiled).toContain('__setElementText(el1, item.id);');
    expect(rowUpdate).not.toContain('__setElementText(el1, item.id);');
    expect(rowUpdate).toContain('__setElementText(el2, item.value);');
  });

  test('keeps closure variables in keyed row dependencies', () => {
    const source = `
      function List() {
        let selected = 0;
        const rows = [{ id: 1, label: 'A' }];
        exports.select = () => { selected = 1; };
        return () => (
          <table>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} class={selected === row.id ? 'selected' : ''}>
                  <td>{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain("(row) => [selected === row.id ? 'selected' : '', row.label]");

    const evaluated = evaluateCompiled(compiled) as { List: () => unknown; select(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.List as any));

    expect(root.querySelector('tr')!.className).toBe('');

    evaluated.select();
    app.render();

    expect(root.querySelector('tr')!.className).toBe('selected');
  });

  test('lowers keyed map rows into reusable row blocks', () => {
    const source = `
      function List() {
        let items = [
          { id: 'a', label: 'A', done: false },
          { id: 'b', label: 'B', done: false },
          { id: 'c', label: 'C', done: false },
        ];
        exports.actions = {
          replaceB() {
            items = [items[0], { id: 'b', label: 'B2', done: true }, items[2]];
          },
          swap() {
            items = [items[2], items[1], items[0]];
          },
          removeB() {
            items = [items[0], items[2]];
          },
        };
        return () => (
          <ul>
            {items.map((item) => (
              <li key={item.id} class={item.done ? 'done' : ''}>{item.label}</li>
            ))}
          </ul>
        );
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toContain('items.map');

    const evaluated = evaluateCompiled(compiled) as {
      List: () => unknown;
      actions?: { replaceB(): void; swap(): void; removeB(): void };
    };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.List as any));
    const actions = evaluated.actions!;

    const initial = Array.from(root.querySelectorAll('li'));
    expect(initial.map((node) => node.textContent)).toEqual(['A', 'B', 'C']);

    actions.replaceB();
    app.render();

    const replaced = Array.from(root.querySelectorAll('li'));
    expect(replaced.map((node) => node.textContent)).toEqual(['A', 'B2', 'C']);
    expect(replaced[1]).toBe(initial[1]);
    expect(replaced[1]!.className).toBe('done');

    actions.swap();
    app.render();

    const swapped = Array.from(root.querySelectorAll('li'));
    expect(swapped.map((node) => node.textContent)).toEqual(['C', 'B2', 'A']);
    expect(swapped[0]).toBe(initial[2]);
    expect(swapped[1]).toBe(initial[1]);
    expect(swapped[2]).toBe(initial[0]);

    actions.removeB();
    app.render();

    const removed = Array.from(root.querySelectorAll('li'));
    expect(removed.map((node) => node.textContent)).toEqual(['C', 'A']);
    expect(removed[0]).toBe(initial[2]);
    expect(removed[1]).toBe(initial[0]);
  });

  test('compiles unkeyed maps with positional recycling', () => {
    const source = `
      function List() {
        let items = ['A', 'B'];
        exports.update = () => { items = ['A', 'C', 'D']; };
        return () => <ul>{items.map((item) => <li>{item}</li>)}</ul>;
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toContain('items.map');

    const evaluated = evaluateCompiled(compiled) as { List: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.List as any));

    const initial = Array.from(root.querySelectorAll('li'));
    expect(initial.map((node) => node.textContent)).toEqual(['A', 'B']);

    const firstLi = initial[0];

    evaluated.update();
    app.render();

    const updated = Array.from(root.querySelectorAll('li'));
    expect(updated.map((node) => node.textContent)).toEqual(['A', 'C', 'D']);
    expect(updated[0]).toBe(firstLi);
  });

  test('compiles block-bodied map callbacks', () => {
    const source = `
      function List() {
        const items = [{ id: 1, label: 'A' }];
        return () => (
          <ul>
            {items.map((item) => {
              return <li key={item.id}>{item.label}</li>;
            })}
          </ul>
        );
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toContain('items.map');

    const { List } = evaluateCompiled(compiled) as { List: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(List as any));

    expect(root.querySelector('li')!.textContent).toBe('A');
  });

  test('compiles function-expression map callbacks', () => {
    const source = `
      function List() {
        const items = [{ id: 1, label: 'A' }];
        return () => (
          <ul>
            {items.map(function (item) {
              return <li key={item.id}>{item.label}</li>;
            })}
          </ul>
        );
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toContain('items.map');

    const { List } = evaluateCompiled(compiled) as { List: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(List as any));

    expect(root.querySelector('li')!.textContent).toBe('A');
  });
});
