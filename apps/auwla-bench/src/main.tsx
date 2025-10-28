import { h, Fragment,ref,onMount,watch,For, flushSync } from 'auwla';

// Use stable ids and reactive values to avoid remounts on updates
const items = ref(Array.from({ length: 800 }, (_, i) => ({ id: i, value: ref(i) })));
const filterText = ref('');
const tick = ref(0);

// Derived list must depend on both items and filter text
const filtered = watch([items, filterText], ([list, q]) => {
  const needle = q.toLowerCase();
  return needle ? list.filter((it) => String(it.value.value).includes(needle)) : list;
});

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
  onMount(() => {
    performance.mark('mount:start');
    queueMicrotask(() => measure('mount'));
  });

  const updateAll = () => {
    performance.mark('update-all:start');
    for (const it of items.value) {
      it.value.value++;
    }
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
        <For each={filtered} key={(it)=>it.id}>
        {(it)=> <div class="card">Row {it.value}</div>}
      </For>
      </div>
    </div>
  );
}

const root = document.getElementById('app')!;
root.appendChild(<App />);