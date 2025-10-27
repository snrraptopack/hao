function summarize(samples, ops = 1) {
  const n = samples.length || 1;
  const mean = samples.reduce((a,b)=> a+b, 0) / n;
  const min = samples.length ? Math.min(...samples) : 0;
  const max = samples.length ? Math.max(...samples) : 0;
  const variance = samples.reduce((acc,x)=> acc + Math.pow(x-mean,2), 0) / n;
  const stddev = Math.sqrt(variance);
  const opsPerSec = mean > 0 ? (ops * 1000) / mean : 0;
  return { mean, stddev, min, max, opsPerSec };
}
function measure(fn) { const t0 = performance.now(); fn(); const t1 = performance.now(); return t1 - t0; }

function createItems(n) { const arr = new Array(n); for (let i=0;i<n;i++) arr[i] = { id: i, text: `Item ${i}`, active: false }; return arr; }

export default function App() {
  const state = { items: 1000, updates: 200, iterations: 5, inserts: 200 };
  let mount = null; let output = '';
  const log = (line) => { output += line + '\n'; pre.textContent = output; };
  const clear = () => { output = ''; pre.textContent = ''; };

  const container = document.createElement('div'); container.className = 'box';
  const title = document.createElement('h1'); title.textContent = 'Vanilla JS Bench'; title.style.fontSize = '20px'; title.style.fontWeight='600'; title.style.marginBottom = '8px'; container.appendChild(title);

  const controls = document.createElement('div'); controls.className = 'controls';
  controls.appendChild(labelNumber('Items', state.items, (v)=> state.items = v));
  controls.appendChild(labelNumber('Updates', state.updates, (v)=> state.updates = v));
  controls.appendChild(labelNumber('Iterations', state.iterations, (v)=> state.iterations = v));
  controls.appendChild(labelNumber('Inserts', state.inserts, (v)=> state.inserts = v));
  container.appendChild(controls);

  const actions = document.createElement('div'); actions.className = 'controls';
  actions.appendChild(button('Text Update', runTextUpdate));
  actions.appendChild(button('Class Toggle', runClassToggle));
  actions.appendChild(button('Insert/Remove', runInsertRemove));
  actions.appendChild(button('Reorder (reverse)', runReorderReverse));
  container.appendChild(actions);

  const mounts = document.createElement('div'); mounts.className = 'mounts';
  const box = document.createElement('div'); box.className = 'box'; mounts.appendChild(box); container.appendChild(mounts); mount = box;

  const pre = document.createElement('pre'); container.appendChild(pre);

  function renderList(items) {
    const frag = document.createDocumentFragment();
    for (const it of items) {
      const p = document.createElement('p');
      if (it.active) p.classList.add('active');
      p.textContent = it.text;
      p.dataset.id = String(it.id);
      frag.appendChild(p);
    }
    mount.replaceChildren(frag);
  }

  function runTextUpdate() {
    clear();
    const samplesCreate = []; const samplesUpdate = [];
    for (let iter=0; iter<state.iterations; iter++) {
      const items = createItems(state.items);
      const cMs = measure(()=> { renderList(items); }); samplesCreate.push(cMs);
      const uMs = measure(()=> { for (let i=0;i<state.updates;i++){ const idx = i % items.length; items[idx].text = `Update ${iter}-${i}`; const node = mount.children[idx]; if (node) node.textContent = items[idx].text; } });
      samplesUpdate.push(uMs);
    }
    const c = summarize(samplesCreate, state.items); const u = summarize(samplesUpdate, state.updates);
    log(`== Text Update ==`);
    log(`Vanilla Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Vanilla Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${(u.opsPerSec||0).toFixed(0)}`);
  }

  function runClassToggle() {
    clear();
    const samplesCreate = []; const samplesUpdate = [];
    for (let iter=0; iter<state.iterations; iter++) {
      const items = createItems(state.items);
      const cMs = measure(()=> { renderList(items); }); samplesCreate.push(cMs);
      const uMs = measure(()=> { for (let i=0;i<state.updates;i++){ const idx = i % items.length; items[idx].active = !items[idx].active; const node = mount.children[idx]; if (node) node.classList.toggle('active'); } }); samplesUpdate.push(uMs);
    }
    const c = summarize(samplesCreate, state.items); const u = summarize(samplesUpdate, state.updates);
    log(`== Class Toggle ==`);
    log(`Vanilla Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Vanilla Update ms: mean=${u.mean.toFixed(2)}, stddev=${u.stddev.toFixed(2)}, min=${u.min.toFixed(2)}, max=${u.max.toFixed(2)}, ops/sec=${(u.opsPerSec||0).toFixed(0)}`);
  }

  function runInsertRemove() {
    clear();
    const samplesCreate = []; const samplesMutate = [];
    for (let iter=0; iter<state.iterations; iter++) {
      let items = createItems(state.items);
      const cMs = measure(()=> { renderList(items); }); samplesCreate.push(cMs);
      const mMs = measure(()=> { const remove = Math.min(state.inserts, items.length); const next = items.slice(remove); const tail = createItems(state.inserts).map((it,i)=> ({...it, id: items.length + i})); items = next.concat(tail); renderList(items); }); samplesMutate.push(mMs);
    }
    const c = summarize(samplesCreate, state.items); const m = summarize(samplesMutate, state.inserts * 2);
    log(`== Insert/Remove ==`);
    log(`Vanilla Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Vanilla Mutate ms: mean=${m.mean.toFixed(2)}, stddev=${m.stddev.toFixed(2)}, min=${m.min.toFixed(2)}, max=${m.max.toFixed(2)}, ops/sec=${(m.opsPerSec||0).toFixed(0)}`);
  }

  function runReorderReverse() {
    clear();
    const samplesCreate = []; const samplesReorder = [];
    for (let iter=0; iter<state.iterations; iter++) {
      const items = createItems(state.items);
      const cMs = measure(()=> { renderList(items); }); samplesCreate.push(cMs);
      const rMs = measure(()=> { const reversed = items.slice().reverse(); renderList(reversed); }); samplesReorder.push(rMs);
    }
    const c = summarize(samplesCreate, state.items); const r = summarize(samplesReorder);
    log(`== Reorder (reverse) ==`);
    log(`Vanilla Create ms: mean=${c.mean.toFixed(2)}, stddev=${c.stddev.toFixed(2)}, min=${c.min.toFixed(2)}, max=${c.max.toFixed(2)}, ops/sec=${(c.opsPerSec||0).toFixed(0)}`);
    log(`Vanilla Reorder ms: mean=${r.mean.toFixed(2)}, stddev=${r.stddev.toFixed(2)}, min=${r.min.toFixed(2)}, max=${r.max.toFixed(2)}`);
  }

  return container;
}

function labelNumber(text, value, onChange) {
  const label = document.createElement('label'); label.textContent = text + ' ';
  const input = document.createElement('input'); input.type='number'; input.value = String(value);
  input.addEventListener('input', (e)=> { const v = parseInt(e.target.value||'0'); onChange(v); });
  label.appendChild(input); return label;
}
function button(text, onClick) { const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', onClick); return b; }