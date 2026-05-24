import { createMemoApp, memo } from 'auwla';
import type {} from 'auwla/jsx-runtime';

interface BenchmarkItem {
  id: number;
  value: number;
}

let app: any = null;
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function PerfBenchmark() {
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

    const renderStart = performance.now();
    app.render();
    renderMs = performance.now() - renderStart;

    const paintStart = performance.now();
    await nextFrame();
    paintMs = performance.now() - paintStart;

    totalMs = performance.now() - start;
    lastLabel = label;
    console.table({ label, items: items.length, mutationMs, renderMs, paintMs, totalMs });
    app.render();
  };

  // 2. Render Scope: Runs on every event re-render.
  return () => (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Auwla Performance Benchmark</h1>
      <p>This benchmark forces one synchronous render per action and measures mutation, DOM patch, next paint, and total time separately.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
        <Metric label="Action" value={lastLabel} />
        <Metric label="Items" value={String(items.length)} />
        <Metric label="Mutation" value={`${mutationMs.toFixed(2)}ms`} />
        <Metric label="Render/Patch" value={`${renderMs.toFixed(2)}ms`} />
        <Metric label="Next Paint" value={`${paintMs.toFixed(2)}ms`} />
        <Metric label="Total" value={`${totalMs.toFixed(2)}ms`} />
      </div>
      
      {/* Control Panel */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
        gap: '8px' 
      }}>
        {items.map(item => (
          memo(item.id, [item.value], () => <div key={item.id} style={{ 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '6px',
            textAlign: 'center',
            backgroundColor: item.value > 100 ? '#e6ffed' : '#f9f9f9',
            borderColor: item.value > 100 ? '#28a745' : '#ddd',
            transition: 'background-color 0.2s'
          }}>
            <div style={{ fontSize: '12px', color: '#666' }}>ID: {item.id}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
              {item.value}
            </div>
          </div>)
        ))}
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return () => (
    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', background: '#f9f9f9' }}>
      <div style={{ fontSize: '12px', color: '#666' }}>{props.label}</div>
      <strong>{props.value}</strong>
    </div>
  );
}

// Bootstrap the app and assign it to the app reference
const root = document.getElementById('app');
if (root) {
  app = createMemoApp(root, <PerfBenchmark />);
}
