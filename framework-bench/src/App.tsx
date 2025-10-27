import { h, Fragment, For, ref, watch, flushSync, type Ref } from 'auwla';
import { summarize, measure } from './bench';

type Item = { id: number; text: Ref<string>; active: Ref<boolean> };

function createItems(n: number): Item[] {
  const arr: Item[] = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = { id: i, text: ref(`Item ${i}`), active: ref(false) };
  return arr;
}

export default function App(): HTMLElement {
  const itemsCount = ref(1000);
  const updates = ref(200);
  const iterations = ref(5);
  const inserts = ref(200);
  const output = ref('');

  let mount: HTMLElement | null = null;

  const log = (line: string) => { output.value = output.value + line + "\n"; };
  const clear = () => { output.value = ''; };

  function TextList(props: { each: Ref<Item[]> }) {
    return (
      <div>
        <For each={props.each} key={(it) => it.id}>
          {(it) => <p>{it.text}</p>}
        </For>
      </div>
    ) as any as HTMLElement;
  }

  function ClassList(props: { each: Ref<Item[]> }) {
    return (
      <div>
        <For each={props.each} key={(it) => it.id}>
          {(it) => (
            <p className={watch(it.active, (v) => (v ? 'active' : ''))}>{it.text}</p>
          )}
        </For>
      </div>
    ) as any as HTMLElement;
  }

  function runTextUpdate() {
    clear();
    const samplesCreate: number[] = [];
    const samplesUpdate: number[] = [];

    for (let iter = 0; iter < iterations.value; iter++) {
      const listRef = ref<Item[]>([]);
      const items = createItems(itemsCount.value);
      if (mount) { mount.innerHTML = ''; mount.appendChild(TextList({ each: listRef })); }
      const cMs = measure(() => { listRef.value = items; flushSync(); });
      samplesCreate.push(cMs);

      const uMs = measure(() => {
        for (let i = 0; i < updates.value; i++) {
          const idx = i % items.length;
          items[idx].text.value = `Update ${iter}-${i}`;
        }
        flushSync();
      });
      samplesUpdate.push(uMs);
    }

    const c = summarize(samplesCreate, itemsCount.value);
    const u = summarize(samplesUpdate, updates.value);
    log(`== Text Update ==`);
    log(`Framework Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Framework Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${(u.opsPerSec||0).toFixed(0)}`);
  }

  function runClassToggle() {
    clear();
    const samplesCreate: number[] = [];
    const samplesUpdate: number[] = [];

    for (let iter = 0; iter < iterations.value; iter++) {
      const listRef = ref<Item[]>([]);
      const items = createItems(itemsCount.value);
      if (mount) { mount.innerHTML = ''; mount.appendChild(ClassList({ each: listRef })); }
      const cMs = measure(() => { listRef.value = items; flushSync(); });
      samplesCreate.push(cMs);

      const uMs = measure(() => {
        for (let i = 0; i < updates.value; i++) {
          const idx = i % items.length;
          items[idx].active.value = !items[idx].active.value;
        }
        flushSync();
      });
      samplesUpdate.push(uMs);
    }

    const c = summarize(samplesCreate, itemsCount.value);
    const u = summarize(samplesUpdate, updates.value);
    log(`== Class Toggle ==`);
    log(`Framework Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Framework Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${(u.opsPerSec||0).toFixed(0)}`);
  }

  function runInsertRemove() {
    clear();
    const samplesCreate: number[] = [];
    const samplesMutate: number[] = [];

    for (let iter = 0; iter < iterations.value; iter++) {
      const listRef = ref<Item[]>([]);
      let items = createItems(itemsCount.value);
      if (mount) { mount.innerHTML = ''; mount.appendChild(TextList({ each: listRef })); }
      const cMs = measure(() => { listRef.value = items; flushSync(); });
      samplesCreate.push(cMs);

      const mMs = measure(() => {
        const remove = Math.min(inserts.value, items.length);
        const next = items.slice(remove);
        const tail = createItems(inserts.value).map((it, i) => ({ ...it, id: items.length + i }));
        items = next.concat(tail);
        listRef.value = items;
        flushSync();
      });
      samplesMutate.push(mMs);
    }

    const c = summarize(samplesCreate, itemsCount.value);
    const m = summarize(samplesMutate, inserts.value * 2);
    log(`== Insert/Remove ==`);
    log(`Framework Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Framework Mutate ms: mean=${m.mean.toFixed(2)}, stddev=${m.stddev.toFixed(2)}, min=${m.min.toFixed(2)}, max=${m.max.toFixed(2)}, ops/sec=${(m.opsPerSec||0).toFixed(0)}`);
  }

  function runReorderReverse() {
    clear();
    const samplesCreate: number[] = [];
    const samplesReorder: number[] = [];

    for (let iter = 0; iter < iterations.value; iter++) {
      const listRef = ref<Item[]>([]);
      const items = createItems(itemsCount.value);
      if (mount) { mount.innerHTML = ''; mount.appendChild(TextList({ each: listRef })); }
      const cMs = measure(() => { listRef.value = items; flushSync(); });
      samplesCreate.push(cMs);

      const rMs = measure(() => {
        listRef.value = items.slice().reverse();
        flushSync();
      });
      samplesReorder.push(rMs);
    }

    const c = summarize(samplesCreate, itemsCount.value);
    const r = summarize(samplesReorder);
    log(`== Reorder (reverse) ==`);
    log(`Framework Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Framework Reorder ms: mean=${r.mean.toFixed(2)}, stddev=${r.stddev.toFixed(2)}, min=${r.min.toFixed(2)}, max=${r.max.toFixed(2)}`);
  }

  return (
    <div className="box">
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Framework Bench</h1>
      <div className="controls">
        <label>Items <input type="number" value={itemsCount.value} onInput={(e:any)=>{itemsCount.value=parseInt(e.target.value||'0')}} /></label>
        <label>Updates <input type="number" value={updates.value} onInput={(e:any)=>{updates.value=parseInt(e.target.value||'0')}} /></label>
        <label>Iterations <input type="number" value={iterations.value} onInput={(e:any)=>{iterations.value=parseInt(e.target.value||'0')}} /></label>
        <label>Inserts <input type="number" value={inserts.value} onInput={(e:any)=>{inserts.value=parseInt(e.target.value||'0')}} /></label>
      </div>

      <div className="controls">
        <button onClick={runTextUpdate}>Text Update</button>
        <button onClick={runClassToggle}>Class Toggle</button>
        <button onClick={runInsertRemove}>Insert/Remove</button>
        <button onClick={runReorderReverse}>Reorder (reverse)</button>
      </div>

      <div className="mounts">
        <div ref={(el:any)=> (mount = el)} className="box"></div>
      </div>

      <pre>{output}</pre>
    </div>
  ) as any as HTMLElement;
}