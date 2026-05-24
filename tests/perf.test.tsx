/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp, type MemoApp } from 'auwla';

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
          <div key={item.id} class={item.value > 100 ? 'hot' : 'cold'}>
            <span>ID: {item.id}</span>
            <strong>{item.value}</strong>
          </div>
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

