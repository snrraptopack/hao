import React, { useEffect, useMemo, useRef, useState } from 'react';

function measure(name: string) {
  try {
    performance.mark(name + ':end');
    performance.measure(name, name + ':start', name + ':end');
    const m = performance.getEntriesByName(name).pop();
    if (m) console.log(`[react] ${name}: ${m.duration.toFixed(2)}ms`);
    performance.clearMarks(name + ':start');
    performance.clearMarks(name + ':end');
    performance.clearMeasures(name);
  } catch {}
}

export function App() {
  const [items, setItems] = useState<number[]>(() => Array.from({ length: 800 }, (_, i) => i));
  const [filter, setFilter] = useState('');
  const tick = useRef(0);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return q ? items.filter((n) => String(n).includes(q)) : items;
  }, [items, filter]);

  useEffect(() => {
    queueMicrotask(() => measure('mount'));
  }, []);

  const updateAll = () => {
    performance.mark('update-all:start');
    setItems((prev) => prev.map((n) => n + 1));
    tick.current++;
    queueMicrotask(() => measure('update-all'));
  };

  const shuffle = () => {
    performance.mark('shuffle:start');
    setItems((prev) => {
      const arr = prev.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    tick.current++;
    queueMicrotask(() => measure('shuffle'));
  };

  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    performance.mark('type:start');
    setFilter(e.target.value);
    queueMicrotask(() => measure('type'));
  };

  return (
    <>
      <div className="toolbar">
        <button onClick={updateAll}>Update All</button>
        <button onClick={shuffle}>Shuffle</button>
        <input placeholder="Filter" value={filter} onChange={onType} />
        <span className="small">tick: {tick.current}</span>
        <span className="small">items: {items.length}</span>
        <span className="small">filtered: {filtered.length}</span>
      </div>
      <div className="grid">
        {filtered.map((n) => (
          <div key={n} className="card">Row {n}</div>
        ))}
      </div>
    </>
  );
}