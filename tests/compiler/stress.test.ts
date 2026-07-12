import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('reactivity stress cases', () => {
  test('nested Map mutations update derived sizes', async () => {
    const source = `
      function App() {
        const teams = new Map([
          ['red', { members: new Map([[1, 'Alice'], [2, 'Bob']]) }],
          ['blue', { members: new Map([[3, 'Carol']]) }],
        ]);
        let totalMembers = [...teams.values()].reduce((sum, t) => sum + t.members.size, 0);

        function addMember(teamKey: string) {
          const id = Date.now();
          teams.get(teamKey)!.members.set(id, 'New');
        }

        return () => (
          <div>
            <span id="total">{totalMembers}</span>
            <button onClick={() => addMember('red')}>Add</button>
            <div>
              {[...teams.entries()].map(([key, team]) => (
                <span id={key}>{key}: {team.members.size}</span>
              ))}
            </div>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(App as any));

    expect(root.querySelector('#total')!.textContent).toBe('3');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#total')!.textContent).toBe('4');
    expect(root.querySelector('#red')!.textContent).toBe('red: 3');
  });

  test('Set of objects tracks membership by reference', async () => {
    const source = `
      function App() {
        const alice = { name: 'Alice' };
        const bob = { name: 'Bob' };
        const selected = new Set([alice]);
        let selectedNames = [...selected].map(p => p.name).join(', ') || '(none)';

        function toggle(person: any) {
          if (selected.has(person)) selected.delete(person);
          else selected.add(person);
        }

        return () => (
          <div>
            <span id="names">{selectedNames}</span>
            <button id="alice" onClick={() => toggle(alice)}>Alice</button>
            <button id="bob" onClick={() => toggle(bob)}>Bob</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#names')!.textContent).toBe('Alice');
    root.querySelector('#alice')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#names')!.textContent).toBe('(none)');
    root.querySelector('#bob')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#names')!.textContent).toBe('Bob');
  });

  test('Map.clear() updates derived size and keys', async () => {
    const source = `
      function App() {
        const cache = new Map([[1, 'a'], [2, 'b'], [3, 'c']]);
        let cacheSize = cache.size;
        let cacheKeys = [...cache.keys()].join(', ');

        function clearCache() {
          cache.clear();
        }

        return () => (
          <div>
            <span id="size">{cacheSize}</span>
            <span id="keys">{cacheKeys || '(empty)'}</span>
            <button onClick={clearCache}>Clear</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#size')!.textContent).toBe('3');
    expect(root.querySelector('#keys')!.textContent).toBe('1, 2, 3');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#size')!.textContent).toBe('0');
    expect(root.querySelector('#keys')!.textContent).toBe('(empty)');
  });

  test('array splice/reverse/sort mutations update derived reads', async () => {
    const source = `
      function App() {
        let items = ['a', 'b', 'c'];
        let joined = items.join('-');

        function reverse() { items.reverse(); }
        function splice() { items.splice(1, 1); }

        return () => (
          <div>
            <span id="joined">{joined}</span>
            <button id="rev" onClick={reverse}>Reverse</button>
            <button id="splice" onClick={splice}>Splice</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#joined')!.textContent).toBe('a-b-c');
    root.querySelector('#rev')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#joined')!.textContent).toBe('c-b-a');
    root.querySelector('#splice')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#joined')!.textContent).toBe('c-a');
  });

  test('destructured alias mutation updates keyed row class', async () => {
    const source = `
      function App() {
        let habits = [
          { id: 1, name: 'Drink Water', done: false },
        ];

        function toggleHabit(habit: any) {
          let { done } = habit;
          habit.done = !done;
        }

        return () => (
          <ul>
            {habits.map(h => (
              <li key={h.id}>
                <input type="checkbox" checked={h.done} onChange={() => toggleHabit(h)} />
                <span class={h.done ? 'done' : ''}>{h.name}</span>
              </li>
            ))}
          </ul>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const span = root.querySelector('span')!;
    expect(span.className).toBe('');
    root.querySelector('input')!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(span.className).toBe('done');
  });

  test('chained derived values update on source mutation', async () => {
    const source = `
      function App() {
        let count = 0;
        let doubled = count * 2;
        let quadrupled = doubled * 2;

        function bump() { count++; }

        return () => (
          <div>
            <span id="q">{quadrupled}</span>
            <button onClick={bump}>+</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#q')!.textContent).toBe('0');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#q')!.textContent).toBe('4');
  });

  test('conditional class with multiple Tailwind-like classes updates', async () => {
    const source = `
      function App() {
        let active = false;
        function toggle() { active = !active; }

        return () => (
          <button
            class={active ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200 text-black'}
            onClick={toggle}
          >
            Toggle
          </button>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const button = root.querySelector('button')!;
    expect(button.className).toBe('bg-gray-200 text-black');
    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(button.className).toBe('bg-blue-500 text-white font-bold');
  });

  test('mixed array and nested object mutation', async () => {
    const source = `
      function App() {
        let groups = [
          { name: 'A', items: [{ id: 1, label: 'x' }] },
        ];
        let totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

        function addItem() {
          groups[0].items.push({ id: Date.now(), label: 'y' });
        }

        return () => (
          <div>
            <span id="total">{totalItems}</span>
            <button onClick={addItem}>Add</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#total')!.textContent).toBe('1');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#total')!.textContent).toBe('2');
  });

  test('raw fetch promise updates status without explicit commit wrapper', async () => {
    const source = `
      function App() {
        let status = 'idle';

        function load() {
          status = 'loading';
          Promise.resolve().then(() => { status = 'done'; });
        }

        return () => (
          <div>
            <span id="status">{status}</span>
            <button onClick={load}>Load</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#status')!.textContent).toBe('idle');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#status')!.textContent).toBe('done');
  });

  test('Object.assign and spread replacement update derived reads', async () => {
    const source = `
      function App() {
        let user = { profile: { name: 'Ada', age: 30 } };
        let display = user.profile.name + ' (' + user.profile.age + ')';

        function rename() {
          Object.assign(user.profile, { name: 'Grace' });
        }
        function replace() {
          user.profile = { ...user.profile, age: 31 };
        }

        return () => (
          <div>
            <span id="display">{display}</span>
            <button id="rename" onClick={rename}>Rename</button>
            <button id="replace" onClick={replace}>Replace</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#display')!.textContent).toBe('Ada (30)');
    root.querySelector('#rename')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#display')!.textContent).toBe('Grace (30)');
    root.querySelector('#replace')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#display')!.textContent).toBe('Grace (31)');
  });

  test('Map with object keys preserves identity and updates', async () => {
    const source = `
      function App() {
        const alice = { name: 'Alice' };
        const bob = { name: 'Bob' };
        const scores = new Map([[alice, 10], [bob, 20]]);
        let total = [...scores.values()].reduce((a, b) => a + b, 0);

        function increment(person: any) {
          scores.set(person, (scores.get(person) || 0) + 1);
        }

        return () => (
          <div>
            <span id="total">{total}</span>
            <button id="alice" onClick={() => increment(alice)}>+Alice</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#total')!.textContent).toBe('30');
    root.querySelector('#alice')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#total')!.textContent).toBe('31');
  });

  test('Set union via spread updates membership count', async () => {
    const source = `
      function App() {
        let a = new Set([1, 2]);
        let b = new Set([2, 3]);
        let union = new Set([...a, ...b]);
        let count = union.size;

        function addToA() {
          a.add(4);
          union = new Set([...a, ...b]);
        }

        return () => (
          <div>
            <span id="count">{count}</span>
            <button onClick={addToA}>Add</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#count')!.textContent).toBe('3');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelector('#count')!.textContent).toBe('4');
  });

  test('mutation inside setTimeout updates view', async () => {
    const source = `
      function App() {
        let count = 0;

        function delayBump() {
          setTimeout(() => { count++; }, 10);
        }

        return () => (
          <div>
            <span id="count">{count}</span>
            <button onClick={delayBump}>Delay +</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('#count')!.textContent).toBe('0');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(root.querySelector('#count')!.textContent).toBe('1');
  });

  test('nested keyed maps render and update independently', async () => {
    const source = `
      function App() {
        let groups = [
          { id: 1, name: 'A', items: [{ id: 10, label: 'x' }] },
        ];

        function addItem() {
          groups[0].items = [...groups[0].items, { id: Date.now(), label: 'y' }];
          groups = [...groups];
        }

        return () => (
          <div>
            {groups.map(g => (
              <section key={g.id}>
                <h2>{g.name} ({g.items.length})</h2>
                <ul>
                  {g.items.map(item => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </section>
            ))}
            <button onClick={addItem}>Add</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelectorAll('li').length).toBe(1);
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.querySelectorAll('li').length).toBe(2);
  });

  test('input bind inside keyed row keeps per-item state', async () => {
    const source = `
      function App() {
        let items = [
          { id: 1, text: 'a' },
          { id: 2, text: 'b' },
        ];

        return () => (
          <ul>
            {items.map(item => (
              <li key={item.id}>
                <input id={'input-' + item.id} bind={item.text} />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const input1 = root.querySelector('#input-1') as HTMLInputElement;
    input1.value = 'changed';
    input1.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(root.querySelectorAll('span')[0]!.textContent).toBe('changed');
    expect(root.querySelectorAll('span')[1]!.textContent).toBe('b');
  });

  test('spread props with dynamic class and style', async () => {
    const source = `
      function App() {
        let active = false;
        let props = {
          class: active ? 'bg-blue text-white' : 'bg-gray text-black',
          style: { padding: active ? '16px' : '8px' },
        };

        function toggle() {
          active = !active;
          props = {
            class: active ? 'bg-blue text-white' : 'bg-gray text-black',
            style: { padding: active ? '16px' : '8px' },
          };
        }

        return () => (
          <div>
            <span id="box" {...props}>Box</span>
            <button onClick={toggle}>Toggle</button>
          </div>
        );
      }
      exports.App = App;
    `;

    const { App } = evaluateCompiled(compileAuwla(source)) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    const box = root.querySelector('#box') as HTMLElement;
    expect(box.className).toBe('bg-gray text-black');
    expect(box.style.padding).toBe('8px');
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(box.className).toBe('bg-blue text-white');
    expect(box.style.padding).toBe('16px');
  });
});
