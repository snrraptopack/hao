/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp, memo, type MemoApp } from 'auwla';
import { compileAuwla, evaluateCompiled, h } from './compiler/_helpers';

type Item = { id: number; value: number };

type BenchActions = {
  create(count: number): void;
  updateAll(): void;
  updateOne(index: number): void;
  swap(a: number, b: number): void;
  clear(): void;
};

function createBench(root: HTMLElement) {
  let app: MemoApp<never>;
  const actions = {} as BenchActions;

  function Bench() {
    let nextId = 1;
    let items: Item[] = [];

    actions.create = (count) => {
      items = [];
      for (let i = 0; i < count; i++) {
        items.push({ id: nextId++, value: i });
      }
    };
    actions.updateAll = () => {
      for (const item of items) item.value++;
    };
    actions.updateOne = (index) => {
      if (items[index]) items[index].value += 100;
    };
    actions.swap = (a, b) => {
      const left = items[a];
      const right = items[b];
      if (!left || !right) return;
      items[a] = right;
      items[b] = left;
    };
    actions.clear = () => {
      items = [];
    };

    return () => (
      <section>
        {items.map((item) => (
          memo(item.id, [item.value], () => <div key={item.id} class={item.value > 100 ? 'hot' : 'cold'}>
            <span>ID: {item.id}</span>
            <strong>{item.value}</strong>
          </div>)
        ))}
      </section>
    );
  }

  app = createMemoApp(root, <Bench />);
  return { app: app!, actions };
}

function measure(label: string, fn: () => void) {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  console.log(`[perf] ${label}: ${duration.toFixed(2)}ms`);
  return duration;
}

describe('runtime performance smoke metrics', () => {
  test('__computed memoization: repeated render', () => {
    const source = `
      function App() {
        let count = 0;
        let items = Array.from({ length: 1000 }, (_, i) => i);
        let evenItems = items.filter(i => i % 2 === 0);

        exports.bump = () => { count++; };

        return () => <div>{count} {evenItems.length}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(App as any));

    for (let i = 0; i < 10; i++) {
      app.render();
    }

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      app.render();
    }
    const end = performance.now();

    const avg = (end - start) / iterations;
    console.log(`[perf] repeated render with cached derived: ${avg.toFixed(4)} ms per render`);
    expect(avg).toBeGreaterThan(0);
  });

  test('__computed memoization: derived updates on dependency change', async () => {
    const source = `
      function App() {
        let count = 0;
        let items = Array.from({ length: 1000 }, (_, i) => i);
        let evenItems = items.filter(i => i % 2 === 0);

        function addItem() { items = [...items, items.length]; }

        return () => <div>{count} {evenItems.length} <button onClick={addItem}>Add</button></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.textContent).toContain('500');

    const button = root.querySelector('button')!;
    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.textContent).toContain('501');
  });

  test('large keyed list operations', () => {
    const root = document.createElement('div');
    const { app, actions } = createBench(root);

    const create1000 = measure('create+render 1,000 keyed rows', () => {
      actions.create(1000);
      app.render();
    });

    const firstNode = root.querySelector('div');

    const updateOne = measure('update+render 1 keyed row in 1,000', () => {
      actions.updateOne(500);
      app.render();
    });

    const updateAll = measure('update+render all 1,000 keyed rows', () => {
      actions.updateAll();
      app.render();
    });

    const swap = measure('swap+render 2 keyed rows in 1,000', () => {
      actions.swap(1, 998);
      app.render();
    });

    const clear = measure('clear+render 1,000 rows', () => {
      actions.clear();
      app.render();
    });

    expect(root.querySelectorAll('div')).toHaveLength(0);
    expect(firstNode).toBeTruthy();
    expect(create1000).toBeGreaterThan(0);
    expect(updateOne).toBeGreaterThan(0);
    expect(updateAll).toBeGreaterThan(0);
    expect(swap).toBeGreaterThan(0);
    expect(clear).toBeGreaterThan(0);
  });
});
