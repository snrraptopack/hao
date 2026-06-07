import { component, commit } from 'auwla';
import type {} from 'auwla/jsx-runtime';
import './styles.css';

interface BenchmarkItem {
  id: number;
  value: number;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function PerfBenchmark() {
  const self = component();
  // 1. Setup Scope: Runs once. Stores state in standard array/variables.
  let items: BenchmarkItem[] = [];
  let nextId = 1;
  let lastLabel = 'No run yet';
  let mutationMs = 0;
  let renderMs = 0;
  let paintMs = 0;
  let totalMs = 0;

  const measure = async (label: string, fn: () => void) => {
    const start = performance.now();
    fn();
    mutationMs = performance.now() - start;

    // Let Auwla's automatic re-render flush, then measure next frame for paint
    const renderStart = performance.now();
    await new Promise<void>((r) => queueMicrotask(r));
    renderMs = performance.now() - renderStart;

    const paintStart = performance.now();
    await nextFrame();
    paintMs = performance.now() - paintStart;

    totalMs = performance.now() - start;
    lastLabel = label;
    console.table({ label, items: items.length, mutationMs, renderMs, paintMs, totalMs });
    commit(self);
  };

  // 2. Render Scope: Runs on every event re-render.
  return () => (
    <div class="perf-page">
      <h1>Auwla Performance Benchmark</h1>
      <p>This benchmark measures mutation, async render, next paint, and total time.</p>
      <div class="perf-metrics">
        <div class="perf-metric">
          <div>Action</div>
          <strong>{lastLabel}</strong>
        </div>
        <div class="perf-metric">
          <div>Items</div>
          <strong>{String(items.length)}</strong>
        </div>
        <div class="perf-metric">
          <div>Mutation</div>
          <strong>{`${mutationMs.toFixed(2)}ms`}</strong>
        </div>
        <div class="perf-metric">
          <div>Render/Patch</div>
          <strong>{`${renderMs.toFixed(2)}ms`}</strong>
        </div>
        <div class="perf-metric">
          <div>Next Paint</div>
          <strong>{`${paintMs.toFixed(2)}ms`}</strong>
        </div>
        <div class="perf-metric">
          <div>Total</div>
          <strong>{`${totalMs.toFixed(2)}ms`}</strong>
        </div>
      </div>
      
      {/* Control Panel */}
      <div class="perf-controls">
        <button onClick={() => measure('Create 1,000 Items', () => {
          items = [];
          for (let i = 0; i < 1000; i++) {
            items.push({ id: nextId++, value: Math.floor(Math.random() * 100) });
          }
        })}>
          Create 1,000
        </button>

        <button onClick={() => measure('Update All Values', () => {
          items.forEach(item => item.value += 1);
        })}>
          Update All
        </button>

        <button onClick={() => measure('Update Single Item', () => {
          if (items.length > 0) {
            const randomIndex = Math.floor(Math.random() * items.length);
            items[randomIndex]!.value += 100;
          }
        })}>
          Update Random Single
        </button>

        <button onClick={() => measure('Swap Rows (2 and 5)', () => {
          if (items.length > 5) {
            const second = items[1]!;
            items[1] = items[4]!;
            items[4] = second;
          }
        })}>
          Swap Items 2 & 5
        </button>

        <button onClick={() => measure('Clear List', () => {
          items = [];
        })}>
          Clear All
        </button>
      </div>

      {/* Grid of Items */}
      <div class="perf-grid">
        {items.map(item => (
          <div key={item.id} class={item.value > 100 ? 'perf-card hot' : 'perf-card'}>
            <div class="perf-id">ID: {item.id}</div>
            <div class="perf-value">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PerfExample() {
  return () => <PerfBenchmark />;
}
