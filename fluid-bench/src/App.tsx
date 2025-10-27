import { Component, ref, watch, flushSync, type Ref, type LayoutBuilder } from 'auwla';
import { summarize, measure } from './bench';

type Item = { id: number; text: Ref<string>; active: Ref<boolean> };
function createItems(n: number): Item[] { const arr: Item[] = new Array(n); for (let i=0;i<n;i++) arr[i] = { id: i, text: ref(`Item ${i}`), active: ref(false) }; return arr; }

export default function App(): HTMLElement {
  const itemsCount = ref(1000);
  const updates = ref(200);
  const iterations = ref(5);
  const inserts = ref(200);
  const output = ref('');
  let mount: HTMLElement | null = null;
  const log = (line: string) => { output.value = output.value + line + "\n"; };
  const clear = () => { output.value = ''; };

  const ListComp = (each: Ref<Item[]>, renderer: (item: Item, i: number, ui: LayoutBuilder)=>void) => {
    return Component((ui) => {
      ui.List<Item>({ items: each, key: (it)=> it.id, render: renderer });
    });
  };

  function runTextUpdate() {
    clear();
    const samplesCreate: number[] = [];
    const samplesUpdate: number[] = [];
    for (let iter=0; iter<iterations.value; iter++) {
      const each = ref<Item[]>([]);
      const items = createItems(itemsCount.value);
      const comp = ListComp(each, (item, i, ui) => {
        ui.P({ className: 'py-0.5 text-gray-800', text: item.text });
      });
      if (mount) { mount.innerHTML=''; mount.appendChild(comp); }
      const cMs = measure(()=> { each.value = items; flushSync(); });
      samplesCreate.push(cMs);
      const uMs = measure(()=> { for (let i=0;i<updates.value;i++){ const idx = i % items.length; items[idx].text.value = `Update ${iter}-${i}`; } flushSync(); });
      samplesUpdate.push(uMs);
    }
    const c = summarize(samplesCreate, itemsCount.value);
    const u = summarize(samplesUpdate, updates.value);
    log(`== Text Update ==`);
    log(`Fluid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Fluid Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${(u.opsPerSec||0).toFixed(0)}`);
  }

  function runClassToggle() {
    clear();
    const samplesCreate: number[] = [];
    const samplesUpdate: number[] = [];
    for (let iter=0; iter<iterations.value; iter++) {
      const each = ref<Item[]>([]);
      const items = createItems(itemsCount.value);
      const comp = ListComp(each, (item, i, ui) => {
        ui.P({ className: watch(item.active, v=> v ? 'active': '' ) as Ref<string>, text: item.text });
      });
      if (mount) { mount.innerHTML=''; mount.appendChild(comp); }
      const cMs = measure(()=> { each.value = items; flushSync(); }); samplesCreate.push(cMs);
      const uMs = measure(()=> { for (let i=0;i<updates.value;i++){ const idx = i % items.length; items[idx].active.value = !items[idx].active.value; } flushSync(); });
      samplesUpdate.push(uMs);
    }
    const c = summarize(samplesCreate, itemsCount.value);
    const u = summarize(samplesUpdate, updates.value);
    log(`== Class Toggle ==`);
    log(`Fluid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Fluid Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${(u.opsPerSec||0).toFixed(0)}`);
  }

  function runInsertRemove() {
    clear();
    const samplesCreate: number[] = [];
    const samplesMutate: number[] = [];
    for (let iter=0; iter<iterations.value; iter++) {
      const each = ref<Item[]>([]);
      let items = createItems(itemsCount.value);
      const comp = ListComp(each, (item, i, ui) => {
        ui.P({ className: 'py-0.5 text-gray-800', text: item.text });
      });
      if (mount) { mount.innerHTML=''; mount.appendChild(comp); }
      const cMs = measure(()=> { each.value = items; flushSync(); }); samplesCreate.push(cMs);
      const mMs = measure(()=> {
        const remove = Math.min(inserts.value, items.length);
        const next = items.slice(remove);
        const tail = createItems(inserts.value).map((it, i)=> ({ ...it, id: items.length + i }));
        items = next.concat(tail);
        each.value = items;
        flushSync();
      });
      samplesMutate.push(mMs);
    }
    const c = summarize(samplesCreate, itemsCount.value);
    const m = summarize(samplesMutate, inserts.value * 2);
    log(`== Insert/Remove ==`);
    log(`Fluid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Fluid Mutate ms: mean=${m.mean.toFixed(2)}, stddev=${m.stddev.toFixed(2)}, min=${m.min.toFixed(2)}, max=${m.max.toFixed(2)}, ops/sec=${(m.opsPerSec||0).toFixed(0)}`);
  }

  function runReorderReverse() {
    clear();
    const samplesCreate: number[] = [];
    const samplesReorder: number[] = [];
    for (let iter=0; iter<iterations.value; iter++) {
      const each = ref<Item[]>([]);
      const items = createItems(itemsCount.value);
      const comp = ListComp(each, (item, i, ui) => {
        ui.P({ className: 'py-0.5 text-gray-800', text: item.text });
      });
      if (mount) { mount.innerHTML=''; mount.appendChild(comp); }
      const cMs = measure(()=> { each.value = items; flushSync(); }); samplesCreate.push(cMs);
      const rMs = measure(()=> { each.value = items.slice().reverse(); flushSync(); }); samplesReorder.push(rMs);
    }
    const c = summarize(samplesCreate, itemsCount.value);
    const r = summarize(samplesReorder);
    log(`== Reorder (reverse) ==`);
    log(`Fluid Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Fluid Reorder ms: mean=${r.mean.toFixed(2)}, stddev=${r.stddev.toFixed(2)}, min=${r.min.toFixed(2)}, max=${r.max.toFixed(2)}`);
  }

  return Component((ui)=> {
    ui.Div({ className: 'box' }, (ui)=> {
      ui.H1({ text: 'Fluid Bench', className: 'text-xl font-bold mb-2' });
      ui.Div({ className: 'controls' }, (ui)=> {
        ui.P({ text: 'Items' }); ui.Input({ type: 'number', value: watch(itemsCount, ()=> String(itemsCount.value)) as Ref<string>, on: { input: (e:any)=> { itemsCount.value = parseInt(e.target.value||'0'); } } });
        ui.P({ text: 'Updates' }); ui.Input({ type: 'number', value: watch(updates, ()=> String(updates.value)) as Ref<string>, on: { input: (e:any)=> { updates.value = parseInt(e.target.value||'0'); } } });
        ui.P({ text: 'Iterations' }); ui.Input({ type: 'number', value: watch(iterations, ()=> String(iterations.value)) as Ref<string>, on: { input: (e:any)=> { iterations.value = parseInt(e.target.value||'0'); } } });
        ui.P({ text: 'Inserts' }); ui.Input({ type: 'number', value: watch(inserts, ()=> String(inserts.value)) as Ref<string>, on: { input: (e:any)=> { inserts.value = parseInt(e.target.value||'0'); } } });
      });
      ui.Div({ className: 'controls' }, (ui)=> {
        ui.Button({ text: 'Text Update', on: { click: runTextUpdate } });
        ui.Button({ text: 'Class Toggle', on: { click: runClassToggle } });
        ui.Button({ text: 'Insert/Remove', on: { click: runInsertRemove } });
        ui.Button({ text: 'Reorder (reverse)', on: { click: runReorderReverse } });
      });
      ui.Div({ className: 'mounts' }, (ui)=> { ui.Div({ className: 'box', ref: (el:HTMLElement)=> { mount = el; } }); });
      ui.P({
        text: output,
        style: {
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          padding: '8px',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '0.875rem'
        }
      });
    });
  });
}