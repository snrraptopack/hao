import { h, Fragment,ref,onMount,watch,For, flushSync,derive } from '../../../src/index';

// Plain numbers array wrapped in ref (like React/Vue)
const items = ref(Array.from({ length: 800 }, (_, i) => i));
const filterText = ref('');
const tick = ref(0);


const filtered  = derive(()=>{
  const needle = filterText.value.toLowerCase()

  return needle ? items.value.filter(it=> String(it).includes(needle)) : items.value
})

// const filtered = watch([items, filterText], ([list, q]) => {
//   const needle = q.toLowerCase();
//   return needle ? list.filter((n) => String(n).includes(needle)) : list;
// });

function measure(name: string) {
  try {
    performance.mark(name + ':end');
    performance.measure(name, name + ':start', name + ':end');
    const m = performance.getEntriesByName(name).pop();
    if (m) console.log(`[auwla] ${name}: ${m.duration.toFixed(2)}ms`);
    performance.clearMarks(name + ':start');
    performance.clearMarks(name + ':end');
    performance.clearMeasures(name);
  } catch {}
}

function App() {
  const updateAll = () => {
    performance.mark('update-all:start');
    // Immutable update - creates new array with incremented values
    items.value = items.value.map(n => n + 1);
    // Ensure batched updates flush before measuring/paint for snappier UI
    flushSync();
    tick.value++;
    queueMicrotask(() => measure('update-all'));
  };

  const shuffle = () => {
    performance.mark('shuffle:start');
    const arr = items.value.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    items.value = arr;
    flushSync();
    tick.value++;
    queueMicrotask(() => measure('shuffle'));
  };

  const onType = (e: Event) => {
    performance.mark('type:start');
    filterText.value = (e.target as HTMLInputElement).value;
    flushSync();
    queueMicrotask(() => measure('type'));
  };

  return (
    <div>
      <div class="toolbar">
        <button onClick={updateAll}>Update All</button>
        <button onClick={shuffle}>Shuffle</button>
        <input placeholder="Filter" value={filterText} onInput={onType} />
        <span class="small">tick: {tick}</span>
        <span class="small">items: {items.value.length}</span>
        <span class="small">filtered: {filtered.value.length}</span>
      </div>
      <div class="grid">
        <For each={filtered} key={(it)=> `${it}`}>
        {(n)=> <div class="card">Row {n}</div>}
      </For>
      </div>
    </div>
  );
}

performance.mark('mount:start');
const root = document.getElementById('app')!;
root.appendChild(<App />);
performance.mark('mount:end');
queueMicrotask(() => measure('mount'));