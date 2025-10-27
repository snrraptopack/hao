import { createSignal, batch, For } from 'solid-js';
import { render } from 'solid-js/web';
import { summarize, measure } from './bench';

type Item = { id: number; text: () => string; setText: (v: string) => void; active: () => boolean; setActive: (v: boolean) => void };

function createItems(n: number): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < n; i++) {
    const [t, setT] = createSignal(`Item ${i}`);
    const [a, setA] = createSignal(i % 2 === 0);
    items.push({ id: i, text: t, setText: setT, active: a, setActive: setA });
  }
  return items;
}

function TextList(props: { items: Item[] }) {
  return (
    <div>
      <For each={props.items}>
        {(it) => <p>{it.text()}</p>}
      </For>
    </div>
  );
}

function ClassList(props: { items: Item[] }) {
  return (
    <div>
      <For each={props.items}>
        {(it) => (
          <p classList={{ active: it.active() }}>{it.text()}</p>
        )}
      </For>
    </div>
  );
}

function KeyedList(props: { items: Item[] }) {
  return (
    <div>
      <For each={props.items}>
        {(it) => (
          <div data-id={it.id} classList={{ active: it.active() }}>{it.text()}</div>
        )}
      </For>
    </div>
  );
}

export default function App() {
  const [itemsCount, setItemsCount] = createSignal(1000);
  const [updates, setUpdates] = createSignal(1000);
  const [iterations, setIterations] = createSignal(3);
  const [inserts, setInserts] = createSignal(200);

  const [output, setOutput] = createSignal('');

  // Maintain a sub-root under #solid-root for mounting lists
  let subDispose: (() => void) | undefined;
  const mountList = (factory: () => any) => {
    const mount = document.getElementById('solid-root')!;
    // Cleanup previous render if any
    if (subDispose) {
      try { subDispose(); } catch {}
      subDispose = undefined;
    }
    // Render new list under the mount container
    subDispose = render(factory, mount);
  };

  function log(line: string) {
    setOutput((prev) => prev + line + '\n');
  }

  function clear() {
    setOutput('');
  }

  function runTextUpdate() {
    clear();
    const samplesCreate: number[] = [];
    const samplesUpdate: number[] = [];

    for (let iter = 0; iter < iterations(); iter++) {
      const items = createItems(itemsCount());
      const createMs = measure(() => {
        // Render text list using Solid's renderer
        mountList(() => <TextList items={items} />);
      });
      samplesCreate.push(createMs);

      const updateMs = measure(() => {
        batch(() => {
          for (let i = 0; i < updates(); i++) {
            const idx = i % items.length;
            items[idx].setText(`Update ${iter}-${i}`);
          }
        });
      });
      samplesUpdate.push(updateMs);
    }

    const c = summarize(samplesCreate, itemsCount());
    const u = summarize(samplesUpdate, updates());
    log(`== Text Update ==`);
    log(`Solid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${c.opsPerSec!.toFixed(0)}`);
    log(`Solid Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${u.opsPerSec!.toFixed(0)}`);
  }

  function runClassToggle() {
    clear();
    const samplesCreate: number[] = [];
    const samplesUpdate: number[] = [];

    for (let iter = 0; iter < iterations(); iter++) {
      const items = createItems(itemsCount());
      const createMs = measure(() => {
        mountList(() => <ClassList items={items} />);
      });
      samplesCreate.push(createMs);

      const updateMs = measure(() => {
        batch(() => {
          for (let i = 0; i < updates(); i++) {
            const idx = i % items.length;
            items[idx].setActive(!items[idx].active());
          }
        });
      });
      samplesUpdate.push(updateMs);
    }

    const c = summarize(samplesCreate, itemsCount());
    const u = summarize(samplesUpdate, updates());
    log(`== Class Toggle ==`);
    log(`Solid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${c.opsPerSec!.toFixed(0)}`);
    log(`Solid Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${u.opsPerSec!.toFixed(0)}`);
  }

  function runInsertRemove() {
    clear();
    const samplesCreate: number[] = [];
    const samplesMutate: number[] = [];

    for (let iter = 0; iter < iterations(); iter++) {
      const base = createItems(itemsCount());
      const createMs = measure(() => {
        mountList(() => <KeyedList items={base} />);
      });
      samplesCreate.push(createMs);

      const mutateMs = measure(() => {
        // remove inserts/2 from start and add inserts/2 new items at end
        const rem = Math.min(inserts() >> 1, base.length);
        base.splice(0, rem);
        const extra = createItems(inserts() - rem).map((it, j) => ({ ...it, id: base.length + j + iter * 100000 }));
        base.push(...extra);
        // re-render list in place (simulate keyed diff scenario)
        mountList(() => <KeyedList items={base} />);
      });
      samplesMutate.push(mutateMs);
    }

    const c = summarize(samplesCreate, itemsCount());
    const m = summarize(samplesMutate, inserts());
    log(`== Insert/Remove ==`);
    log(`Solid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${c.opsPerSec!.toFixed(0)}`);
    log(`Solid Mutate ms: mean=${m.mean.toFixed(2)}, stddev=${m.stddev.toFixed(2)}, min=${m.min.toFixed(2)}, max=${m.max.toFixed(2)}, ops/sec=${m.opsPerSec!.toFixed(0)}`);
  }

  function runReorderReverse() {
    clear();
    const samplesCreate: number[] = [];
    const samplesReorder: number[] = [];

    for (let iter = 0; iter < iterations(); iter++) {
      const base = createItems(itemsCount());
      const createMs = measure(() => {
        mountList(() => <KeyedList items={base} />);
      });
      samplesCreate.push(createMs);

      const reorderMs = measure(() => {
        base.reverse();
        mountList(() => <KeyedList items={base} />);
      });
      samplesReorder.push(reorderMs);
    }

    const c = summarize(samplesCreate, itemsCount());
    const r = summarize(samplesReorder, itemsCount());
    log(`== Reorder (reverse) ==`);
    log(`Solid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${c.opsPerSec!.toFixed(0)}`);
    log(`Solid Reorder ms: mean=${r.mean.toFixed(2)}, stddev=${r.stddev.toFixed(2)}, min=${r.min.toFixed(2)}, max=${r.max.toFixed(2)}`);
  }

  return (
    <div style={{ padding: '16px', 'font-family': 'system-ui, sans-serif' }}>
      <h2>SolidJS Bench</h2>
      <div style={{ display: 'flex', gap: '12px', 'flex-wrap': 'wrap' }}>
        <label>
          Items
          <input type="number" value={itemsCount()} onInput={(e) => setItemsCount(parseInt((e.target as HTMLInputElement).value || '0'))} />
        </label>
        <label>
          Updates
          <input type="number" value={updates()} onInput={(e) => setUpdates(parseInt((e.target as HTMLInputElement).value || '0'))} />
        </label>
        <label>
          Iterations
          <input type="number" value={iterations()} onInput={(e) => setIterations(parseInt((e.target as HTMLInputElement).value || '0'))} />
        </label>
        <label>
          Inserts
          <input type="number" value={inserts()} onInput={(e) => setInserts(parseInt((e.target as HTMLInputElement).value || '0'))} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        <button onClick={runTextUpdate}>Run Text Update</button>
        <button onClick={runClassToggle}>Run Class Toggle</button>
        <button onClick={runInsertRemove}>Run Insert/Remove</button>
        <button onClick={runReorderReverse}>Run Reorder (reverse)</button>
      </div>
      <div id="solid-root" style={{ border: '1px solid #ddd', padding: '8px', minHeight: '120px' }}></div>
      <pre style={{ background: '#f8f8f8', padding: '8px', marginTop: '12px', 'white-space': 'pre-wrap' }}>{output()}</pre>
    </div>
  );
}